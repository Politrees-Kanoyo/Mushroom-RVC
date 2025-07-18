import asyncio
import gc
import os

import edge_tts
import gradio as gr
import torch
from fairseq.checkpoint_utils import load_model_ensemble_and_task
from fairseq.data.dictionary import Dictionary
from pydub import AudioSegment
from scipy.io import wavfile

from rvc.infer.config import Config
from rvc.infer.pipeline import VC
from rvc.lib.algorithm.synthesizers import Synthesizer
from rvc.lib.my_utils import load_audio

# Определяем пути к папкам и файлам (константы)
RVC_MODELS_DIR = os.path.join(os.getcwd(), "models", "RVC_models")
OUTPUT_DIR = os.path.join(os.getcwd(), "output", "RVC_output")
HUBERT_BASE_PATH = os.path.join(os.getcwd(), "rvc", "models", "embedders", "hubert_base.pt")

# Создаем папки, если их нет
os.makedirs(RVC_MODELS_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Инициализация конфигурации
config = Config()


# Отображает прогресс выполнения задачи.
def display_progress(percent, message, is_print, progress=gr.Progress()):
    if is_print:
        print(message)
    progress(percent, desc=message)


# Загружает модель RVC и индекс по имени модели.
def load_rvc_model(rvc_model):
    # Формируем путь к директории модели
    model_dir = os.path.join(RVC_MODELS_DIR, rvc_model)
    # Получаем список файлов в директории модели
    model_files = os.listdir(model_dir)

    # Находим файл модели с расширением .pth
    rvc_model_path = next((os.path.join(model_dir, f) for f in model_files if f.endswith(".pth")), None)
    # Находим файл индекса с расширением .index
    rvc_index_path = next((os.path.join(model_dir, f) for f in model_files if f.endswith(".index")), None)

    # Проверяем, существует ли файл модели
    if not rvc_model_path:
        raise ValueError(
            f"\033[91mОШИБКА!\033[0m Модель {rvc_model} не обнаружена. Возможно, вы допустили ошибку в названии или указали неверную ссылку при установке."
        )

    return rvc_model_path, rvc_index_path


# Загружает модель Hubert
def load_hubert(model_path):
    torch.serialization.add_safe_globals([Dictionary])
    model, _, _ = load_model_ensemble_and_task([model_path], suffix="")
    hubert = model[0].to(config.device).float()
    hubert.eval()
    return hubert


# Получает конвертер голоса
def get_vc(model_path):
    # Загружаем состояние модели из файла
    cpt = torch.load(model_path, map_location="cpu", weights_only=True)

    # Проверяем корректность формата модели
    if "config" not in cpt or "weight" not in cpt:
        raise ValueError(f"Некорректный формат для {model_path}. Используйте голосовую модель, обученную на RVC v2.")

    # Извлекаем параметры модели
    tgt_sr = cpt["config"][-1]
    cpt["config"][-3] = cpt["weight"]["emb_g.weight"].shape[0]

    use_f0 = cpt.get("f0", 1)
    version = cpt.get("version", "v1")
    vocoder = cpt.get("vocoder", "HiFi-GAN")
    input_dim = 768 if version == "v2" else 256

    # Инициализируем синтезатор
    net_g = Synthesizer(*cpt["config"], use_f0=use_f0, text_enc_hidden_dim=input_dim, vocoder=vocoder)

    # Удаляем ненужный слой
    del net_g.enc_q
    net_g.load_state_dict(cpt["weight"], strict=False)
    net_g = net_g.to(config.device).float()
    net_g.eval()

    # Инициализируем объект конвертера голоса
    vc = VC(tgt_sr, config)
    return cpt, version, net_g, tgt_sr, vc, use_f0


# Конвертируем файл в выбранный пользователем формат
def convert_audio(input_audio, output_audio, output_format):
    # Загружаем аудиофайл
    audio = AudioSegment.from_file(input_audio)
    # Сохраняем аудиофайл в выбранном формате
    audio.export(output_audio, format=output_format)


# Синтезирует текст в речь с использованием edge_tts.
async def text_to_speech(voice, text, rate, volume, pitch, output_path):
    if not -100 <= rate <= 100:
        raise ValueError("Rate должен быть в диапазоне от -100% до +100%")
    if not -100 <= volume <= 100:
        raise ValueError("Volume должен быть в диапазоне от -100% до +100%")
    if not -100 <= pitch <= 100:
        raise ValueError("Pitch должен быть в диапазоне от -100Hz до +100Hz")

    rate = f"+{rate}%" if rate >= 0 else f"{rate}%"
    volume = f"+{volume}%" if volume >= 0 else f"{volume}%"
    pitch = f"+{pitch}Hz" if pitch >= 0 else f"{pitch}Hz"

    communicate = edge_tts.Communicate(voice=voice, text=text, rate=rate, volume=volume, pitch=pitch)
    await communicate.save(output_path)


# Выполнение инференса с использованием RVC
def rvc_infer(
    rvc_model=None,
    input_path=None,
    f0_method="rmvpe",
    f0_min=50,
    f0_max=1100,
    rvc_pitch=0,
    protect=0.5,
    index_rate=0,
    volume_envelope=1,
    autopitch=False,
    autopitch_threshold=155.0,
    autotune=False,
    autotune_strength=1.0,
    output_format="wav",
):
    if not rvc_model:
        raise ValueError("Выберите модель голоса для преобразования.")
    if not os.path.exists(input_path):
        raise ValueError(f"Не удалось найти файл '{input_path}'. Убедитесь, что он загрузился или проверьте правильность пути к нему.")

    display_progress(0, "\n[⚙️] Запуск конвейера генерации...", True)

    # Загружаем модель Hubert
    display_progress(0.1, "Загружаем модель Hubert...", False)
    hubert_model = load_hubert(HUBERT_BASE_PATH)
    # Загружаем модель RVC и индекс
    display_progress(0.2, "Загружаем модель RVC и индекс...", False)
    model_path, index_path = load_rvc_model(rvc_model)
    # Получаем конвертер голоса
    display_progress(0.3, "Получаем конвертер голоса...", False)
    cpt, version, net_g, tgt_sr, vc, use_f0 = get_vc(model_path)

    # Построение имени выходного файла
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    if len(base_name) > 50:
        gr.Warning("Имя файла превышает 50 символов и будет сокращено для удобства использования.")
        base_name = "Made_in_PolGen"  # Сменить имя файла, если длина исходного более 50 символов
    output_path = os.path.join(OUTPUT_DIR, f"{base_name}_({rvc_model}).{output_format}")

    # Загружаем аудиофайл
    display_progress(0.4, "Загружаем аудиофайл...", False)
    audio = load_audio(input_path, 16000)

    display_progress(0.5, f"[🌌] Преобразование аудио — {base_name}...", True)
    audio_opt = vc.pipeline(
        hubert_model,
        net_g,
        0,
        audio,
        0 if autopitch else rvc_pitch,
        f0_min,
        f0_max,
        f0_method,
        index_path,
        index_rate,
        use_f0,
        volume_envelope,
        version,
        protect,
        autopitch,
        autopitch_threshold,
        autotune,
        autotune_strength,
    )
    # Сохраняем файл и конвертируем его в выбранный формат
    display_progress(0.8, "[💫] Сохраняем результат...", True)
    wavfile.write(output_path, tgt_sr, audio_opt)
    convert_audio(output_path, output_path, output_format)

    # Освобождаем память
    display_progress(0.9, "Освобождаем память...", False)
    del hubert_model, cpt, net_g, vc
    gc.collect()
    torch.cuda.empty_cache()

    display_progress(1.0, f"[✅] Преобразование завершено — {output_path}", True)
    return gr.Audio(output_path, label=os.path.basename(output_path))


def rvc_edgetts_infer(
    # RVC
    rvc_model=None,
    f0_method="rmvpe",
    f0_min=50,
    f0_max=1100,
    rvc_pitch=0,
    protect=0.5,
    index_rate=0,
    volume_envelope=1,
    autopitch=False,
    autopitch_threshold=155.0,
    autotune=False,
    autotune_strength=1.0,
    output_format="wav",
    # EdgeTTS
    tts_voice=None,
    tts_text=None,
    tts_rate=0,
    tts_volume=0,
    tts_pitch=0,
):
    if not tts_text:
        raise ValueError("Введите необходимый текст в поле для ввода.")
    if not tts_voice:
        raise ValueError("Выберите язык и голос для синтеза речи.")

    display_progress(1.0, "[🎙️] Синтезируем речь...", False)
    input_path = os.path.join(OUTPUT_DIR, "TTS_Voice.wav")
    asyncio.run(text_to_speech(tts_voice, tts_text, tts_rate, tts_volume, tts_pitch, input_path))

    output_path = rvc_infer(
        rvc_model=rvc_model,
        input_path=input_path,
        f0_method=f0_method,
        f0_min=f0_min,
        f0_max=f0_max,
        rvc_pitch=rvc_pitch,
        protect=protect,
        index_rate=index_rate,
        volume_envelope=volume_envelope,
        autopitch=autopitch,
        autopitch_threshold=autopitch_threshold,
        autotune=autotune,
        autotune_strength=autotune_strength,
        output_format=output_format,
    )

    return input_path, output_path
