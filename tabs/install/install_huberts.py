import os
import re
import shutil
import urllib.request
import urllib.parse

import gradio as gr

embedders_dir = os.path.join(os.getcwd(), "rvc", "models", "embedders")
hubert_base_path = os.path.join(embedders_dir, "hubert_base.pt")

base_url = "https://huggingface.co/Politrees/RVC_resources/resolve/main/embedders/"

models = [
    "hubert_base.pt",
    "contentvec_base.pt",
    "korean_hubert_base.pt",
    "chinese_hubert_base.pt",
    "portuguese_hubert_base.pt",
    "japanese_hubert_base.pt",
]

def download_file(url, destination):
    with urllib.request.urlopen(url) as response, open(destination, "wb") as out_file:
        shutil.copyfileobj(response, out_file)

def download_and_replace_model(model_name, custom_url, progress=gr.Progress()):
    try:
        if custom_url:
            if not custom_url.endswith((".pt", "?download=true")):
                return "Ошибка: указанный URL не соответствует требованиям. Он должен вести к файлу с расширением .pt или заканчиваться на '?download=true'"
            model_url = custom_url
            parsed_url = urllib.parse.urlparse(custom_url)
            model_name = os.path.basename(parsed_url.path)
        else:
            model_url = base_url + model_name

        tmp_model_path = os.path.join(embedders_dir, "tmp_model.pt")

        progress(0.4, desc=f'[~] Установка модели "{model_name}"...')
        download_file(model_url, tmp_model_path)

        progress(0.8, desc="[~] Удаление старой HuBERT модели...")
        if os.path.exists(hubert_base_path):
            os.remove(hubert_base_path)

        os.rename(tmp_model_path, hubert_base_path)
        return f'Модель "{model_name}" успешно установлена.'
    except Exception as e:
        return f'Ошибка при установке модели "{model_name}": {str(e)}'

def toggle_custom_url(checkbox_value):
    if checkbox_value:
        return gr.update(visible=True, value=""), gr.update(visible=False, value=None)
    else:
        return gr.update(visible=False, value=""), gr.update(visible=True, value="hubert_base.pt")

def install_hubert_tab():
    with gr.Tab("Установка HuBERT моделей"):
        gr.HTML("<center><h3>Не рекомендуется вносить изменения в этот раздел, если вы не проводили обучение RVC модели с использованием пользователькой HuBERT-модели.</h3></center>")
        with gr.Row(variant="panel", equal_height=True):
            with gr.Column(variant="panel"):
                custom_url_checkbox = gr.Checkbox(label="Использовать другой HuBERT", value=False)
                custom_url_textbox = gr.Textbox(label="URL модели", visible=False)
                hubert_model_dropdown = gr.Dropdown(models, label="Список доступных HuBERT моделей:", visible=True)
            hubert_download_btn = gr.Button("Установить!", variant="primary")
        hubert_output_message = gr.Text(label="Сообщение вывода", interactive=False)

    custom_url_checkbox.change(
        toggle_custom_url,
        inputs=custom_url_checkbox,
        outputs=[custom_url_textbox, hubert_model_dropdown],
    )

    hubert_download_btn.click(
        download_and_replace_model,
        inputs=[hubert_model_dropdown, custom_url_textbox],
        outputs=hubert_output_message,
    )
