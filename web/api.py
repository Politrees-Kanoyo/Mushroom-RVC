# -*- coding: utf-8 -*-

import gc
import os
import sys
from contextlib import contextmanager
from typing import Dict, List, Optional, Tuple

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Глобальная переменная для отслеживания прогресса конвертации
current_conversion_progress = {
    "progress": 0.0,
    "current_step": 0,
    "total_steps": 8,
    "step_name": "Ожидание",
    "description": "Ожидание начала конвертации",
}

from rvc.infer.infer import HUBERT_BASE_PATH, OUTPUT_DIR, RVC_MODELS_DIR, convert_audio, get_vc, load_hubert, load_rvc_model
from rvc.infer.infer import rvc_edgetts_infer as _rvc_edgetts_infer
from rvc.infer.infer import rvc_infer as _rvc_infer
from rvc.infer.infer import text_to_speech
from rvc.modules.model_manager import download_from_url as _download_from_url
from rvc.modules.model_manager import upload_separate_files as _upload_separate_files
from rvc.modules.model_manager import upload_zip_file as _upload_zip_file
from web.gradio.components.modules import OUTPUT_FORMAT, edge_voices, get_folders
from web.gradio.install import MODELS as HUBERT_MODELS
from web.gradio.install import download_and_replace_model as _download_hubert_model


@contextmanager
def memory_cleanup():
    """Контекстный менеджер для очистки памяти после операций"""
    try:
        yield
    finally:
        gc.collect()


def validate_file_exists(file_path: str) -> bool:
    """Проверка существования файла"""
    return os.path.exists(file_path) and os.path.isfile(file_path)


def get_file_size_mb(file_path: str) -> float:
    """Получение размера файла в мегабайтах"""
    if not validate_file_exists(file_path):
        return 0.0
    return os.path.getsize(file_path) / (1024 * 1024)


def safe_remove_file(file_path: str) -> bool:
    """Безопасное удаление файла"""
    try:
        if validate_file_exists(file_path):
            os.remove(file_path)
            return True
    except Exception as e:
        print(f"[WARNING] Не удалось удалить файл {file_path}: {e}")
    return False


class MushroomRVCAPI:
    def __init__(self):
        os.makedirs(RVC_MODELS_DIR, exist_ok=True)
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def voice_conversion(
        self,
        rvc_model: str,
        input_path: str,
        f0_method: str = "rmvpe",
        f0_min: int = 50,
        f0_max: int = 1100,
        rvc_pitch: int = 0,
        protect: float = 0.5,
        index_rate: float = 0.0,
        volume_envelope: float = 1.0,
        autopitch: bool = False,
        autopitch_threshold: float = 155.0,
        autotune: bool = False,
        autotune_strength: float = 1.0,
        output_format: str = "wav",
    ) -> str:
        try:
            # Инициализируем прогресс в начале конвертации
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 10,
                "step_name": "Инициализация",
                "description": "Начинаем конвертацию голоса",
            }

            # Проверка существования входного файла
            if not validate_file_exists(input_path):
                raise Exception(f"Входной файл не найден: {input_path}")

            # Проверка размера файла
            file_size = get_file_size_mb(input_path)
            if file_size > 500:  # 500 MB лимит
                raise Exception(f"Размер файла ({file_size:.1f} MB) превышает лимит 500 MB")

            class ProgressTracker:
                def __init__(self):
                    self.total_steps = 10  # Общее количество основных этапов
                    self.step_mapping = {
                        0.0: (0, "Инициализация", "Запуск конвейера генерации"),
                        0.1: (1, "Загрузка Hubert", "Загружаем модель Hubert"),
                        0.2: (2, "Загрузка RVC", "Загружаем модель RVC и индекс"),
                        0.3: (3, "Конвертер голоса", "Получаем конвертер голоса"),
                        0.4: (4, "Загрузка аудио", "Загружаем аудиофайл"),
                        0.5: (5, "Преобразование", "Преобразование аудио"),
                        0.8: (8, "Сохранение", "Сохраняем результат"),
                        0.9: (9, "Очистка памяти", "Освобождаем память"),
                        1.0: (10, "Завершено", "Преобразование завершено"),
                    }

                def __call__(self, progress_value, desc=None):
                    # Находим ближайший этап по значению прогресса
                    current_step = 0
                    step_name = "Обработка"
                    description = desc or "Выполняется обработка"

                    # Определяем текущий шаг на основе прогресса
                    for threshold, (step, name, default_desc) in self.step_mapping.items():
                        if progress_value >= threshold:
                            current_step = step
                            step_name = name
                            if not desc:  # Используем описание по умолчанию, если не передано
                                description = default_desc

                    # Для промежуточных значений интерполируем шаг
                    if 0.5 < progress_value < 0.8:
                        # Во время основной обработки показываем прогресс более детально
                        interpolated_step = 5 + int((progress_value - 0.5) / 0.3 * 3)
                        current_step = min(interpolated_step, 7)
                        step_name = "Преобразование"
                        if not desc:
                            description = f"Преобразование аудио ({int(progress_value * 100)}%)"

                    # Сохраняем прогресс в глобальную переменную для доступа из веб-интерфейса
                    global current_conversion_progress
                    current_conversion_progress = {
                        "progress": progress_value,
                        "current_step": current_step,
                        "total_steps": self.total_steps,
                        "step_name": step_name,
                        "description": description,
                    }

            progress_tracker = ProgressTracker()

            with memory_cleanup():
                result = _rvc_infer(
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
                    progress=progress_tracker,
                )

            return result

        except Exception as e:
            raise Exception(f"Ошибка при преобразовании голоса: {str(e)}")

    def text_to_speech_conversion(
        self,
        rvc_model: str,
        tts_text: str,
        tts_voice: str = "ru-RU-SvetlanaNeural",
        f0_method: str = "rmvpe",
        f0_min: int = 50,
        f0_max: int = 1100,
        rvc_pitch: int = 0,
        protect: float = 0.5,
        index_rate: float = 0.0,
        volume_envelope: float = 1.0,
        autopitch: bool = False,
        autopitch_threshold: float = 155.0,
        autotune: bool = False,
        autotune_strength: float = 1.0,
        output_format: str = "wav",
        tts_rate: int = 0,
        tts_volume: int = 0,
        tts_pitch: int = 0,
    ) -> Tuple[str, str]:
        try:
            # Инициализируем прогресс в начале TTS конвертации
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 12,
                "step_name": "Инициализация TTS",
                "description": "Начинаем синтез и конвертацию речи",
            }

            # Проверка длины текста
            if len(tts_text) > 10000:  # Лимит на длину текста
                raise Exception(f"Текст слишком длинный ({len(tts_text)} символов). Максимум: 10000 символов")

            class TTSProgressTracker:
                def __init__(self):
                    self.total_steps = 12  # TTS + RVC этапы
                    self.step_mapping = {
                        0.0: (0, "Инициализация TTS", "Подготовка к синтезу речи"),
                        0.05: (1, "Синтез речи", "Синтезируем речь из текста"),
                        0.1: (2, "Загрузка Hubert", "Загружаем модель Hubert"),
                        0.2: (3, "Загрузка RVC", "Загружаем модель RVC и индекс"),
                        0.3: (4, "Конвертер голоса", "Получаем конвертер голоса"),
                        0.4: (5, "Загрузка аудио", "Загружаем синтезированный аудиофайл"),
                        0.5: (6, "Преобразование", "Преобразование голоса"),
                        0.8: (9, "Сохранение", "Сохраняем результат"),
                        0.9: (10, "Очистка памяти", "Освобождаем память"),
                        1.0: (12, "Завершено", "TTS преобразование завершено"),
                    }

                def __call__(self, progress_value, desc=None):
                    # Находим ближайший этап по значению прогресса
                    current_step = 0
                    step_name = "TTS Обработка"
                    description = desc or "Выполняется TTS обработка"

                    # Определяем текущий шаг на основе прогресса
                    for threshold, (step, name, default_desc) in self.step_mapping.items():
                        if progress_value >= threshold:
                            current_step = step
                            step_name = name
                            if not desc:
                                description = default_desc

                    # Для промежуточных значений интерполируем шаг
                    if 0.5 < progress_value < 0.8:
                        interpolated_step = 6 + int((progress_value - 0.5) / 0.3 * 3)
                        current_step = min(interpolated_step, 8)
                        step_name = "Преобразование"
                        if not desc:
                            description = f"Преобразование голоса ({int(progress_value * 100)}%)"

                    # Сохраняем прогресс в глобальную переменную для доступа из веб-интерфейса
                    global current_conversion_progress
                    current_conversion_progress = {
                        "progress": progress_value,
                        "current_step": current_step,
                        "total_steps": self.total_steps,
                        "step_name": step_name,
                        "description": description,
                    }

            tts_progress_tracker = TTSProgressTracker()

            with memory_cleanup():
                synth_path, converted_path = _rvc_edgetts_infer(
                    rvc_model=rvc_model,
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
                    tts_voice=tts_voice,
                    tts_text=tts_text,
                    tts_rate=tts_rate,
                    tts_volume=tts_volume,
                    tts_pitch=tts_pitch,
                    progress=tts_progress_tracker,
                )

            return synth_path, converted_path

        except Exception as e:
            raise Exception(f"Ошибка при TTS преобразовании: {str(e)}")

    def download_model_from_url(self, url: str, model_name: str) -> str:
        try:
            # Инициализируем прогресс в начале загрузки модели
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 5,
                "step_name": "Инициализация",
                "description": "Начинаем загрузку модели",
            }

            class DownloadProgressTracker:
                def __init__(self):
                    self.total_steps = 5

                def __call__(self, progress_value, desc=None):
                    # Простой прогресс для загрузки
                    current_step = min(int(progress_value * self.total_steps), self.total_steps)
                    step_name = "Загрузка модели"
                    description = desc or f"Загружаем модель ({int(progress_value * 100)}%)"

                    global current_conversion_progress
                    current_conversion_progress = {
                        "progress": progress_value,
                        "current_step": current_step,
                        "total_steps": self.total_steps,
                        "step_name": step_name,
                        "description": description,
                    }

            download_progress_tracker = DownloadProgressTracker()
            return _download_from_url(url, model_name, download_progress_tracker)
        except Exception as e:
            raise Exception(f"Ошибка при загрузке модели: {str(e)}")

    def upload_model_zip(self, zip_path: str, model_name: str) -> str:
        try:
            # Инициализируем прогресс в начале загрузки ZIP модели
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 6,
                "step_name": "Инициализация",
                "description": "Начинаем установку модели из ZIP",
            }

            # Проверка существования ZIP файла
            if not validate_file_exists(zip_path):
                raise Exception(f"ZIP файл не найден: {zip_path}")

            # Проверка размера файла
            file_size = get_file_size_mb(zip_path)
            if file_size > 500:  # 500 MB лимит
                raise Exception(f"Размер ZIP файла ({file_size:.1f} MB) превышает лимит 500 MB")

            # Проверка расширения файла
            if not zip_path.lower().endswith(".zip"):
                raise Exception("Файл должен иметь расширение .zip")

            try:
                from gradio import Error as GradioError
            except ImportError:
                GradioError = Exception

            class UploadProgressTracker:
                def __init__(self):
                    self.total_steps = 6

                def __call__(self, progress_value, desc=None):
                    # Прогресс для загрузки ZIP
                    current_step = min(int(progress_value * self.total_steps), self.total_steps)
                    step_name = "Установка модели"
                    description = desc or f"Устанавливаем модель из ZIP ({int(progress_value * 100)}%)"

                    global current_conversion_progress
                    current_conversion_progress = {
                        "progress": progress_value,
                        "current_step": current_step,
                        "total_steps": self.total_steps,
                        "step_name": step_name,
                        "description": description,
                    }

            upload_progress_tracker = UploadProgressTracker()

            class FileWrapper:
                def __init__(self, path):
                    self.name = path

            with memory_cleanup():
                result = _upload_zip_file(FileWrapper(zip_path), model_name, upload_progress_tracker)

            return result

        except GradioError as e:
            error_msg = str(e)
            raise Exception(error_msg)
        except Exception as e:
            raise Exception(f"Ошибка при загрузке ZIP модели: {str(e)}")

    def upload_model_files(self, pth_path: str, index_path: Optional[str], model_name: str) -> str:
        try:
            # Инициализируем прогресс в начале загрузки файлов модели
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 4,
                "step_name": "Инициализация",
                "description": "Начинаем загрузку файлов модели",
            }

            # Проверка существования PTH файла
            if not validate_file_exists(pth_path):
                raise Exception(f"PTH файл не найден: {pth_path}")

            # Проверка размера PTH файла
            pth_size = get_file_size_mb(pth_path)
            if pth_size > 500:  # 500 MB лимит
                raise Exception(f"Размер PTH файла ({pth_size:.1f} MB) превышает лимит 500 MB")

            # Проверка расширения PTH файла
            if not pth_path.lower().endswith(".pth"):
                raise Exception("PTH файл должен иметь расширение .pth")

            # Проверка INDEX файла (если предоставлен)
            if index_path:
                if not validate_file_exists(index_path):
                    raise Exception(f"INDEX файл не найден: {index_path}")

                index_size = get_file_size_mb(index_path)
                if index_size > 100:  # 100 MB лимит для index файлов
                    raise Exception(f"Размер INDEX файла ({index_size:.1f} MB) превышает лимит 100 MB")

                if not index_path.lower().endswith(".index"):
                    raise Exception("INDEX файл должен иметь расширение .index")

            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass

            class FileWrapper:
                def __init__(self, path):
                    self.name = path

            pth_file = FileWrapper(pth_path)
            index_file = FileWrapper(index_path) if index_path else None

            with memory_cleanup():
                result = _upload_separate_files(pth_file, index_file, model_name, DummyProgress())

            return result
        except Exception as e:
            raise Exception(f"Ошибка при загрузке файлов модели: {str(e)}")

    def install_hubert_model(self, model_name: str = "hubert_base.pt", custom_url: Optional[str] = None) -> str:
        try:
            # Инициализируем прогресс в начале установки HuBERT модели
            global current_conversion_progress
            current_conversion_progress = {
                "progress": 0.0,
                "current_step": 0,
                "total_steps": 3,
                "step_name": "Инициализация",
                "description": "Начинаем установку HuBERT модели",
            }

            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass

            return _download_hubert_model(model_name, custom_url, DummyProgress())
        except Exception as e:
            raise Exception(f"Ошибка при установке HuBERT модели: {str(e)}")

    def get_available_models(self) -> List[str]:
        return get_folders()

    def get_available_voices(self) -> Dict[str, List[str]]:
        return edge_voices

    def get_output_formats(self) -> List[str]:
        return OUTPUT_FORMAT

    def get_hubert_models(self) -> List[str]:
        return HUBERT_MODELS

    def get_f0_methods(self) -> List[str]:
        return ["rmvpe+", "rmvpe", "fcpe", "crepe", "crepe-tiny"]

    def convert_audio_format(self, input_path: str, output_path: str, output_format: str) -> None:
        try:
            convert_audio(input_path, output_path, output_format)
        except Exception as e:
            raise Exception(f"Ошибка при конвертации аудио: {str(e)}")

    async def synthesize_speech(
        self, voice: str, text: str, rate: int = 0, volume: int = 0, pitch: int = 0, output_path: str = None
    ) -> str:
        try:
            if output_path is None:
                output_path = os.path.join(OUTPUT_DIR, "synthesized_speech.wav")

            await text_to_speech(voice, text, rate, volume, pitch, output_path)
            return output_path
        except Exception as e:
            raise Exception(f"Ошибка при синтезе речи: {str(e)}")


api = MushroomRVCAPI()


def voice_conversion(*args, **kwargs):
    return api.voice_conversion(*args, **kwargs)


def text_to_speech_conversion(*args, **kwargs):
    return api.text_to_speech_conversion(*args, **kwargs)


def download_model_from_url(*args, **kwargs):
    return api.download_model_from_url(*args, **kwargs)


def upload_model_zip(*args, **kwargs):
    return api.upload_model_zip(*args, **kwargs)


def upload_model_files(*args, **kwargs):
    return api.upload_model_files(*args, **kwargs)


def install_hubert_model(*args, **kwargs):
    return api.install_hubert_model(*args, **kwargs)


def get_available_models():
    return api.get_available_models()


def get_available_voices():
    return api.get_available_voices()


def get_output_formats():
    return api.get_output_formats()


def convert_audio_format(*args, **kwargs):
    return api.convert_audio_format(*args, **kwargs)


async def synthesize_speech(*args, **kwargs):
    return await api.synthesize_speech(*args, **kwargs)


if __name__ == "__main__":
    print("Mushroom RVC API инициализирован")
    print(f"Доступные модели: {get_available_models()}")
