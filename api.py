# -*- coding: utf-8 -*-

import asyncio
import os
import sys
from typing import Optional, Tuple, Dict, Any, List

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from rvc.infer.infer import (
    rvc_infer as _rvc_infer,
    rvc_edgetts_infer as _rvc_edgetts_infer,
    load_rvc_model,
    load_hubert,
    get_vc,
    text_to_speech,
    convert_audio,
    RVC_MODELS_DIR,
    OUTPUT_DIR,
    HUBERT_BASE_PATH
)

from rvc.modules.model_manager import (
    download_from_url as _download_from_url,
    upload_zip_file as _upload_zip_file,
    upload_separate_files as _upload_separate_files
)

from tabs.install import (
    download_and_replace_model as _download_hubert_model,
    MODELS as HUBERT_MODELS
)

from tabs.components.modules import (
    get_folders,
    edge_voices,
    OUTPUT_FORMAT
)


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
        output_format: str = "wav"
    ) -> str:
        """
        
        Args:
            rvc_model: Название модели RVC
            input_path: Путь к входному аудиофайлу
            f0_method: Метод выделения тона (rmvpe, fcpe, crepe, etc.)
            f0_min: Минимальный диапазон тона
            f0_max: Максимальный диапазон тона
            rvc_pitch: Регулировка высоты тона (-24 до 24)
            protect: Защита согласных (0.0 до 0.5)
            index_rate: Влияние индекса (0.0 до 1.0)
            volume_envelope: Скорость смешивания RMS (0.0 до 1.0)
            autopitch: Автоматическое определение высоты тона
            autopitch_threshold: Порог автопитча (155.0 для мужских, 255.0 для женских)
            autotune: Коррекция высоты тона
            autotune_strength: Сила коррекции автотюна (0.0 до 1.0)
            output_format: Формат выходного файла
            
        Returns:
            str: Путь к выходному файлу
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
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
                progress=DummyProgress()
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
        tts_pitch: int = 0
    ) -> Tuple[str, str]:
        """
        
        Args:
            rvc_model: Название модели RVC
            tts_text: Текст для синтеза речи
            tts_voice: Голос для TTS
            (остальные параметры аналогичны voice_conversion)
            tts_rate: Скорость речи TTS (-100 до 100)
            tts_volume: Громкость речи TTS (-100 до 100)
            tts_pitch: Высота тона TTS (-100 до 100)
            
        Returns:
            Tuple[str, str]: Пути к синтезированному и преобразованному файлам
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
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
                progress=DummyProgress()
            )
            
            return synth_path, converted_path
            
        except Exception as e:
            raise Exception(f"Ошибка при TTS преобразовании: {str(e)}")
    
    def download_model_from_url(
        self,
        url: str,
        model_name: str
    ) -> str:
        """
        
        Args:
            url: URL для загрузки ZIP-файла модели
            model_name: Имя модели
            
        Returns:
            str: Сообщение о результате загрузки
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
            return _download_from_url(url, model_name, DummyProgress())
        except Exception as e:
            raise Exception(f"Ошибка при загрузке модели: {str(e)}")
    
    def upload_model_zip(
        self,
        zip_path: str,
        model_name: str
    ) -> str:
        """
        
        Args:
            zip_path: Путь к ZIP-файлу модели
            model_name: Имя модели
            
        Returns:
            str: Сообщение о результате загрузки
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
            class FileWrapper:
                def __init__(self, path):
                    self.name = path
            
            return _upload_zip_file(FileWrapper(zip_path), model_name, DummyProgress())
        except Exception as e:
            raise Exception(f"Ошибка при загрузке ZIP модели: {str(e)}")
    
    def upload_model_files(
        self,
        pth_path: str,
        index_path: Optional[str],
        model_name: str
    ) -> str:
        """
        
        Args:
            pth_path: Путь к .pth файлу
            index_path: Путь к .index файлу (опционально)
            model_name: Имя модели
            
        Returns:
            str: Сообщение о результате загрузки
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
            class FileWrapper:
                def __init__(self, path):
                    self.name = path
            
            pth_file = FileWrapper(pth_path)
            index_file = FileWrapper(index_path) if index_path else None
            
            return _upload_separate_files(pth_file, index_file, model_name, DummyProgress())
        except Exception as e:
            raise Exception(f"Ошибка при загрузке файлов модели: {str(e)}")
    
    def install_hubert_model(
        self,
        model_name: str = "hubert_base.pt",
        custom_url: Optional[str] = None
    ) -> str:
        """
        
        Args:
            model_name: Название HuBERT модели из списка доступных
            custom_url: Пользовательский URL для загрузки (опционально)
            
        Returns:
            str: Сообщение о результате установки
        """
        try:
            class DummyProgress:
                def __call__(self, *args, **kwargs):
                    pass
            
            return _download_hubert_model(model_name, custom_url, DummyProgress())
        except Exception as e:
            raise Exception(f"Ошибка при установке HuBERT модели: {str(e)}")
    
    
    def get_available_models(self) -> List[str]:
        """
        
        Returns:
            List[str]: Список названий моделей
        """
        return get_folders()
    
    def get_available_voices(self) -> Dict[str, List[str]]:
        """
        
        Returns:
            Dict[str, List[str]]: Словарь языков и голосов
        """
        return edge_voices
    
    def get_output_formats(self) -> List[str]:
        """
        
        Returns:
            List[str]: Список форматов
        """
        return OUTPUT_FORMAT
    
    def get_hubert_models(self) -> List[str]:
        """
        
        Returns:
            List[str]: Список HuBERT моделей
        """
        return HUBERT_MODELS
    
    def get_f0_methods(self) -> List[str]:
        """
        
        Returns:
            List[str]: Список методов F0
        """
        return ["rmvpe+", "rmvpe", "fcpe", "crepe", "crepe-tiny"]
    
    def convert_audio_format(
        self,
        input_path: str,
        output_path: str,
        output_format: str
    ) -> None:
        """
        Конвертация аудиофайла в другой формат
        
        Args:
            input_path: Путь к входному файлу
            output_path: Путь к выходному файлу
            output_format: Целевой формат
        """
        try:
            convert_audio(input_path, output_path, output_format)
        except Exception as e:
            raise Exception(f"Ошибка при конвертации аудио: {str(e)}")
    
    async def synthesize_speech(
        self,
        voice: str,
        text: str,
        rate: int = 0,
        volume: int = 0,
        pitch: int = 0,
        output_path: str = None
    ) -> str:
        """
        
        Args:
            voice: Голос для синтеза
            text: Текст для синтеза
            rate: Скорость речи (-100 до 100)
            volume: Громкость (-100 до 100)
            pitch: Высота тона (-100 до 100)
            output_path: Путь для сохранения (опционально)
            
        Returns:
            str: Путь к синтезированному файлу
        """
        try:
            if output_path is None:
                output_path = os.path.join(OUTPUT_DIR, "synthesized_speech.wav")
            
            await text_to_speech(voice, text, rate, volume, pitch, output_path)
            return output_path
        except Exception as e:
            raise Exception(f"Ошибка при синтезе речи: {str(e)}")


api = MushroomRVCAPI()

def voice_conversion(*args, **kwargs):
    """Обертка для преобразования голоса"""
    return api.voice_conversion(*args, **kwargs)

def text_to_speech_conversion(*args, **kwargs):
    """Обертка для TTS преобразования"""
    return api.text_to_speech_conversion(*args, **kwargs)

def download_model_from_url(*args, **kwargs):
    """Обертка для загрузки модели по URL"""
    return api.download_model_from_url(*args, **kwargs)

def upload_model_zip(*args, **kwargs):
    """Обертка для загрузки ZIP модели"""
    return api.upload_model_zip(*args, **kwargs)

def upload_model_files(*args, **kwargs):
    """Обертка для загрузки файлов модели"""
    return api.upload_model_files(*args, **kwargs)

def install_hubert_model(*args, **kwargs):
    """Обертка для установки HuBERT модели"""
    return api.install_hubert_model(*args, **kwargs)

def get_available_models():
    """Обертка для получения списка моделей"""
    return api.get_available_models()

def get_available_voices():
    """Обертка для получения списка голосов"""
    return api.get_available_voices()

def get_output_formats():
    """Обертка для получения форматов вывода"""
    return api.get_output_formats()

def convert_audio_format(*args, **kwargs):
    """Обертка для конвертации аудио"""
    return api.convert_audio_format(*args, **kwargs)

async def synthesize_speech(*args, **kwargs):
    """Обертка для синтеза речи"""
    return await api.synthesize_speech(*args, **kwargs)


if __name__ == "__main__":
    print("Mushroom RVC API инициализирован")
    print(f"Доступные модели: {get_available_models()}")