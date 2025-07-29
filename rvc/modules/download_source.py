import urllib.request
from urllib.parse import urlparse

import gdown
import gradio as gr
import requests
from mega import Mega


# Универсальная функция для скачивания файла с разных источников
def download_file(url, zip_name, progress=gr.Progress(track_tqdm=True)):
    try:
        parsed_url = urlparse(url)
        hostname = parsed_url.hostname
        if hostname in "drive.google.com":
            download_from_google_drive(url, zip_name, progress)
        elif hostname in "huggingface.co":
            download_from_huggingface(url, zip_name, progress)
        elif hostname in "pixeldrain.com":
            download_from_pixeldrain(url, zip_name, progress)
        elif hostname in "mega.nz":
            download_from_mega(url, zip_name, progress)
        elif hostname in {"disk.yandex.ru", "yadi.sk"}:
            download_from_yandex(url, zip_name, progress)
        elif hostname in ("www.dropbox.com", "dropbox.com"):
            download_from_dropbox(url, zip_name, progress)
        else:
            raise ValueError(f"Неподдерживаемый источник: {url}")
    except Exception as e:
        raise gr.Error(f"Ошибка при скачивании: {str(e)}")


# Скачивание файла с Google Drive
def download_from_google_drive(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с Google Drive...")
    file_id = url.split("file/d/")[1].split("/")[0] if "file/d/" in url else url.split("id=")[1].split("&")[0]  # Извлекаем ID файла
    gdown.download(id=file_id, output=str(zip_name), quiet=False)


# Скачивание файла с HuggingFace
def download_from_huggingface(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с HuggingFace...")
    urllib.request.urlretrieve(url, zip_name)


# Скачивание файла с Pixeldrain
def download_from_pixeldrain(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с Pixeldrain...")
    file_id = url.split("pixeldrain.com/u/")[1]  # Извлекаем ID файла
    response = requests.get(f"https://pixeldrain.com/api/file/{file_id}")
    with open(zip_name, "wb") as f:
        f.write(response.content)


# Скачивание файла с Mega
def download_from_mega(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с Mega...")
    m = Mega()
    m.download_url(url, dest_filename=str(zip_name))


# Скачивание файла с Яндекс Диска
def download_from_yandex(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с Яндекс Диска...")
    yandex_public_key = f"download?public_key={url}"  # Формируем публичный ключ
    yandex_api_url = f"https://cloud-api.yandex.net/v1/disk/public/resources/{yandex_public_key}"
    response = requests.get(yandex_api_url)
    if response.status_code == 200:
        download_link = response.json().get("href")  # Получаем ссылку на скачивание
        urllib.request.urlretrieve(download_link, zip_name)
    else:
        raise gr.Error(f"Ошибка при получении ссылки с Яндекс Диска: {response.status_code}")


# Скачивание с Dropbox
def download_from_dropbox(url, zip_name, progress):
    progress(0.5, desc="[~] Загрузка модели с Dropbox...")
    # Преобразуем стандартную ссылку Dropbox в прямую ссылку для скачивания
    download_url = url.replace("www.dropbox.com", "dl.dropboxusercontent.com").replace("?dl=0", "")
    urllib.request.urlretrieve(download_url, zip_name)
