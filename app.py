# Установка необходимых файлов, если их нет
from assets.model_installer import check_and_install_models
check_and_install_models()

print("\nЗапуск интерфейса Mushroom RVC. Подождите...\n")

import logging
import os
import sys
import warnings
from typing import Any

# Настройка окружения
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"

# Настройка логирования и подавление предупреждений
logging.basicConfig(level=logging.WARNING)
warnings.filterwarnings("ignore")

import gradio as gr
from PolUVR.utils import PolUVR_UI

from tabs.inference import edge_tts_tab, inference_tab
from tabs.install import files_upload, install_hubert_tab, output_message, url_zip_download, zip_upload
from tabs.welcome import welcome_tab

DEFAULT_SERVER_NAME = "127.0.0.1"
DEFAULT_PORT = 4000
MAX_PORT_ATTEMPTS = 10

output_message_component = output_message()


def is_offline_mode() -> bool:
    return "--offline" in sys.argv


with gr.Blocks(
    title="Mushroom RVC - Politrees" if not is_offline_mode() else "Mushroom RVC (offline) - Politrees",
    css="footer{display:none !important}",
    theme=gr.themes.Soft(
        primary_hue="green",
        secondary_hue="green",
        neutral_hue="neutral",
        spacing_size="sm",
        radius_size="lg",
    ),
) as app:

    with gr.Tab("Велком/Контакты"):
        welcome_tab()

    with gr.Tab("Преобразование голоса (RVC)"):
        inference_tab()

    if not is_offline_mode():
        with gr.Tab("Преобразование текста в речь (TTS)"):
            edge_tts_tab()

    with gr.Tab("PolUVR (UVR)"):
        if is_offline_mode():
            gr.HTML(
                "<center><h3>PolUVR не будет функционировать без подключения к интернету, если вы ранее не установили необходимые модели.</h3></center>"
            )
        # https://github.com/Bebra777228/PolUVR?tab=readme-ov-file#integrate-our-interface-into-your-gradio-projects
        PolUVR_UI("models/UVR_models", "output/UVR_output")

    with gr.Tab("Загрузка моделей"):
        if not is_offline_mode():
            with gr.Tab("Загрузка RVC моделей"):
                url_zip_download(output_message_component)
                zip_upload(output_message_component)
                files_upload(output_message_component)
                output_message_component.render()
            with gr.Tab("Загрузка HuBERT моделей"):
                install_hubert_tab()
        else:
            with gr.Tab("Загрузка RVC моделей"):
                zip_upload(output_message_component)
                files_upload(output_message_component)
                output_message_component.render()


def launch_gradio(server_name: str, server_port: int) -> None:
    app.launch(
        favicon_path="assets/logo.ico",
        share="--share" in sys.argv,
        inbrowser="--open" in sys.argv,
        server_name=server_name,
        server_port=server_port,
        show_error=True,
    )


def get_value_from_args(key: str, default: Any = None) -> Any:
    if key in sys.argv:
        index = sys.argv.index(key) + 1
        if index < len(sys.argv):
            return sys.argv[index]
    return default


if __name__ == "__main__":
    port = int(get_value_from_args("--port", DEFAULT_PORT))
    server = get_value_from_args("--server-name", DEFAULT_SERVER_NAME)

    for _ in range(MAX_PORT_ATTEMPTS):
        try:
            launch_gradio(server, port)
            break
        except OSError:
            print(f"Не удалось запустить на порту {port}, повторите попытку на порту {port - 1}...")
            port -= 1
        except Exception as error:
            print(f"Произошла ошибка при запуске Gradio: {error}")
            break
