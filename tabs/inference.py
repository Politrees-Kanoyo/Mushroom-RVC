import gc
import os

import gradio as gr
import librosa
import numpy as np
import soundfile as sf
import torch
from pydub import AudioSegment

from rvc.infer.infer import Config, get_vc, load_hubert, rvc_infer

RVC_MODELS_DIR = os.path.join(os.getcwd(), "models")
HUBERT_MODEL_PATH = os.path.join(
    os.getcwd(), "rvc", "models", "embedders", "hubert_base.pt"
)
OUTPUT_DIR = os.path.join(os.getcwd(), "output")


# Отображает прогресс выполнения задачи.
def display_progress(percent, message, progress=gr.Progress()):
    progress(percent, desc=message)


# Загружает модель RVC и индекс по имени модели.
def load_rvc_model(rvc_model):
    # Формируем путь к директории модели
    model_dir = os.path.join(RVC_MODELS_DIR, rvc_model)
    # Получаем список файлов в директории модели
    model_files = os.listdir(model_dir)

    # Находим файл модели с расширением .pth
    rvc_model_path = next(
        (os.path.join(model_dir, f) for f in model_files if f.endswith(".pth")), None
    )
    # Находим файл индекса с расширением .index
    rvc_index_path = next(
        (os.path.join(model_dir, f) for f in model_files if f.endswith(".index")), None
    )

    # Проверяем, существует ли файл модели
    if not rvc_model_path:
        raise ValueError(
            f"\033[91mОШИБКА!\033[0m Модель {rvc_model} не обнаружена. Возможно, вы допустили ошибку в названии или указали неверную ссылку при установке."
        )

    return rvc_model_path, rvc_index_path


# Конвертирует аудиофайл в стерео формат.
def convert_audio(input_audio, output_audio, output_format):
    # Загружаем аудиофайл
    audio = AudioSegment.from_file(input_audio)

    # Если аудио моно, конвертируем его в стерео
    if audio.channels == 1:
        audio = audio.set_channels(2)

    # Сохраняем аудиофайл в выбранном формате
    audio.export(output_audio, format=output_format)


# Выполняет преобразование голоса с использованием модели RVC.
def voice_conversion(
    voice_model,
    vocals_path,
    output_path,
    pitch,
    f0_method,
    index_rate,
    filter_radius,
    volume_envelope,
    protect,
    hop_length,
    f0_min,
    f0_max,
):
    rvc_model_path, rvc_index_path = load_rvc_model(voice_model)

    config = Config()
    hubert_model = load_hubert(config.device, HUBERT_MODEL_PATH)
    cpt, version, net_g, tgt_sr, vc = get_vc(config.device, config, rvc_model_path)

    rvc_infer(
        rvc_index_path,
        index_rate,
        vocals_path,
        output_path,
        pitch,
        f0_method,
        cpt,
        version,
        net_g,
        filter_radius,
        tgt_sr,
        volume_envelope,
        protect,
        hop_length,
        vc,
        hubert_model,
        f0_min,
        f0_max,
    )

    del hubert_model, cpt, net_g, vc
    gc.collect()
    torch.cuda.empty_cache()


# Основной конвейер для преобразования голоса.
def voice_pipeline(
    input_path,
    voice_model,
    pitch,
    index_rate=0.5,
    filter_radius=3,
    volume_envelope=0.25,
    f0_method="rmvpe+",
    hop_length=128,
    protect=0.33,
    output_format="mp3",
    f0_min=50,
    f0_max=1100,
    progress=gr.Progress(),
):
    if not input_path:
        raise ValueError(
            "Не удалось найти аудиофайл. Убедитесь, что файл загрузился или проверьте правильность пути к нему."
        )
    if not voice_model:
        raise ValueError("Выберите модель голоса для преобразования.")
    if not os.path.exists(input_path):
        raise ValueError(f"Файл {input_path} не найден.")

    display_progress(0, "[~] Запуск конвейера генерации...", progress)
    base_name = os.path.splitext(os.path.basename(input_path))[0]
    output_path = os.path.join(OUTPUT_DIR, f"{base_name}_(Converted).{output_format}")

    display_progress(0.4, "[~] Преобразование вокала...", progress)
    voice_conversion(
        voice_model,
        input_path,
        output_path,
        pitch,
        f0_method,
        index_rate,
        filter_radius,
        volume_envelope,
        protect,
        hop_length,
        f0_min,
        f0_max,
    )

    display_progress(0.8, "[~] Конвертация аудио в стерео...", progress)
    convert_audio(output_path, output_path, output_format)

    return output_path


def get_folders(models_dir):
    return [
        item
        for item in os.listdir(models_dir)
        if os.path.isdir(os.path.join(models_dir, item))
    ]


def update_models_list():
    return gr.update(choices=get_folders(RVC_MODELS_DIR))


def process_file_upload(file):
    return file, gr.update(value=file)


def show_hop_slider(pitch_detection_algo):
    if pitch_detection_algo in ["mangio-crepe"]:
        return gr.update(visible=True)
    else:
        return gr.update(visible=False)


def swap_visibility():
    return (
        gr.update(visible=True),
        gr.update(visible=False),
        gr.update(value=""),
        gr.update(value=None),
    )


def swap_buttons():
    return gr.update(visible=False), gr.update(visible=True)


def inference_tab():
    with gr.Row():
        with gr.Column(scale=1, variant="panel"):
            with gr.Group():
                rvc_model = gr.Dropdown(
                    label="Голосовые модели:",
                    choices=get_folders(RVC_MODELS_DIR),
                    allow_custom_value=False,
                    filterable=False,
                    interactive=True,
                    visible=True,
                )
                ref_btn = gr.Button(
                    value="Обновить список моделей",
                    variant="primary",
                    interactive=True,
                    visible=True,
                )
            with gr.Group():
                pitch = gr.Slider(
                    minimum=-24,
                    maximum=24,
                    step=1,
                    value=0,
                    label="Регулировка тона",
                    info="-24 - мужской голос || 24 - женский голос",
                    interactive=True,
                    visible=True,
                )

        with gr.Column(scale=2, variant="panel"):
            with gr.Column() as upload_file:
                local_file = gr.Audio(
                    label="Аудио",
                    type="filepath",
                    show_download_button=False,
                    show_share_button=False,
                    interactive=True,
                    visible=True,
                )

            with gr.Column(visible=False) as enter_local_file:
                song_input = gr.Text(
                    label="Путь к локальному файлу:",
                    info="Введите полный путь к локальному файлу.",
                    interactive=True,
                    visible=True,
                )

            with gr.Column():
                show_upload_button = gr.Button(
                    value="Загрузить файл с устройства",
                    interactive=True,
                    visible=False,
                )
                show_enter_button = gr.Button(
                    value="Ввести путь к локальному файлу",
                    interactive=True,
                    visible=True,
                )

    with gr.Group():
        with gr.Row(equal_height=True):
            generate_btn = gr.Button(
                value="Генерировать",
                variant="primary",
                interactive=True,
                visible=True,
                scale=2,
            )
            converted_voice = gr.Audio(
                label="Преобразованный голос",
                interactive=False,
                visible=True,
                scale=9,
            )
            with gr.Column(min_width=160):
                output_format = gr.Dropdown(
                    value="mp3",
                    label="Формат файла",
                    choices=["wav", "flac", "mp3"],
                    allow_custom_value=False,
                    filterable=False,
                    interactive=True,
                    visible=True,
                )

    with gr.Accordion("Настройки преобразования", open=False):
        with gr.Column(variant="panel"):
            with gr.Accordion("Стандартные настройки", open=False):
                with gr.Group():
                    with gr.Column():
                        f0_method = gr.Dropdown(
                            value="rmvpe+",
                            label="Метод выделения тона",
                            choices=["rmvpe+", "fcpe", "mangio-crepe"],
                            allow_custom_value=False,
                            filterable=False,
                            interactive=True,
                            visible=True,
                        )
                        hop_length = gr.Slider(
                            minimum=8,
                            maximum=512,
                            step=8,
                            value=128,
                            label="Длина шага",
                            info="Меньшие значения приводят к более длительным преобразованиям, что увеличивает риск появления артефактов в голосе, однако при этом достигается более точная передача тона.",
                            interactive=True,
                            visible=False,
                        )
                        index_rate = gr.Slider(
                            minimum=0,
                            maximum=1,
                            step=0.1,
                            value=0,
                            label="Влияние индекса",
                            info="Влияние, оказываемое индексным файлом; Чем выше значение, тем больше влияние. Однако выбор более низких значений может помочь смягчить артефакты, присутствующие в аудио.",
                            interactive=True,
                            visible=True,
                        )
                        filter_radius = gr.Slider(
                            minimum=0,
                            maximum=7,
                            step=1,
                            value=3,
                            label="Радиус фильтра",
                            info="Если это число больше или равно трем, использование медианной фильтрации по собранным результатам тона может привести к снижению дыхания..",
                            interactive=True,
                            visible=True,
                        )
                        volume_envelope = gr.Slider(
                            minimum=0,
                            maximum=1,
                            step=0.01,
                            value=0.25,
                            label="Скорость смешивания RMS",
                            info="Заменить или смешать с огибающей громкости выходного сигнала. Чем ближе значение к 1, тем больше используется огибающая выходного сигнала.",
                            interactive=True,
                            visible=True,
                        )
                        protect = gr.Slider(
                            minimum=0,
                            maximum=0.5,
                            step=0.01,
                            value=0.33,
                            label="Защита согласных",
                            info="Защитить согласные и звуки дыхания, чтобы избежать электроакустических разрывов и артефактов. Максимальное значение параметра 0.5 обеспечивает полную защиту. Уменьшение этого значения может снизить защиту, но уменьшить эффект индексирования.",
                            interactive=True,
                            visible=True,
                        )

            with gr.Accordion("Лополнительные настройки", open=False):
                with gr.Column():
                    with gr.Row():
                        f0_min = gr.Slider(
                            minimum=1,
                            maximum=120,
                            step=1,
                            value=50,
                            label="Минимальный диапазон тона",
                            info="Определяет нижнюю границу диапазона тона, который алгоритм будет использовать для определения основной частоты (F0) в аудиосигнале.",
                            interactive=True,
                            visible=True,
                        )
                        f0_max = gr.Slider(
                            minimum=380,
                            maximum=16000,
                            step=1,
                            value=1100,
                            label="Максимальный диапазон тона",
                            info="Определяет верхнюю границу диапазона тона, который алгоритм будет использовать для определения основной частоты (F0) в аудиосигнале.",
                            interactive=True,
                            visible=True,
                        )

    # Загрузка файлов
    local_file.input(
        process_file_upload, inputs=[local_file], outputs=[song_input, local_file]
    )

    # Обновление кнопок
    show_upload_button.click(
        swap_visibility, outputs=[upload_file, enter_local_file, song_input, local_file]
    )
    show_enter_button.click(
        swap_visibility, outputs=[enter_local_file, upload_file, song_input, local_file]
    )
    show_upload_button.click(
        swap_buttons, outputs=[show_upload_button, show_enter_button]
    )
    show_enter_button.click(
        swap_buttons, outputs=[show_enter_button, show_upload_button]
    )

    # Показать hop_length
    f0_method.change(show_hop_slider, inputs=f0_method, outputs=hop_length)

    # Обновление списка моделей
    ref_btn.click(update_models_list, None, outputs=rvc_model)

    # Запуск процесса преобразования
    generate_btn.click(
        voice_pipeline,
        inputs=[
            song_input,
            rvc_model,
            pitch,
            index_rate,
            filter_radius,
            volume_envelope,
            f0_method,
            hop_length,
            protect,
            output_format,
            f0_min,
            f0_max,
        ],
        outputs=[converted_voice],
    )
