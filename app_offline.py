import logging
import os
import sys

import gradio as gr

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("faiss.loader").setLevel(logging.WARNING)

from tabs.inference import inference_tab
from tabs.install import files_upload, output_message, zip_upload
from tabs.welcome import welcome_tab

DEFAULT_PORT = 4000
MAX_PORT_ATTEMPTS = 10

output_message_component = output_message()

with gr.Blocks(
    title="PolGen (offline) - Politrees",
    css="footer{display:none !important}",
    theme=gr.themes.Soft(
        primary_hue="green",
        secondary_hue="green",
        neutral_hue="neutral",
        spacing_size="sm",
        radius_size="lg",
    ),
) as PolGen:

    with gr.Tab("Велком/Контакты"):
        welcome_tab()

    with gr.Tab("Преобразование голоса (RVC)"):
        inference_tab()

    with gr.Tab("Загрузка RVC моделей"):
        zip_upload(output_message_component)
        files_upload(output_message_component)
        output_message_component.render()


def launch(port):
    PolGen.launch(
        favicon_path=os.path.join(os.getcwd(), "assets", "logo.ico"),
        share="--share" in sys.argv,
        inbrowser="--open" in sys.argv,
        server_port=port,
    )


def get_port_from_args():
    if "--port" in sys.argv:
        port_index = sys.argv.index("--port") + 1
        if port_index < len(sys.argv):
            return int(sys.argv[port_index])
    return DEFAULT_PORT


if __name__ == "__main__":
    port = get_port_from_args()
    for _ in range(MAX_PORT_ATTEMPTS):
        try:
            launch(port)
            break
        except OSError:
            print(
                f"Не удалось запустить на порту {port}, повторите попытку на порту {port - 1}..."
            )
            port -= 1
        except Exception as error:
            print(f"Произошла ошибка при запуске Gradio: {error}")
            break
