import logging
import os

def configure_logging():
    """
    Настраивает конфигурацию логирования для различных библиотек и модулей.

    Эта функция устанавливает уровни логирования для различных библиотек и модулей,
    чтобы сократить количество выводимых сообщений и улучшить читаемость логов.

    Уровни логирования:
    - 0 | DEBUG: Подробная информация, обычно интересная только при отладке проблем.
    - 1 | INFO: Подтверждение того, что все работает как ожидалось.
    - 2 | WARNING: Индикация того, что что-то неожиданное произошло, или индикация
               проблемы в ближайшем будущем (например, 'диск заполняется').
               Программа все еще работает как ожидалось.
    - 3 | ERROR: Из-за более серьезной проблемы программа не может выполнить некоторые функции.
    - 4 | CRITICAL: Серьезная ошибка, указывающая на то, что программа, возможно, не может продолжать выполнение.

    В этом случае мы устанавливаем уровень логирования WARNING для всех библиотек и модулей,
    чтобы игнорировать сообщения уровня DEBUG и INFO.
    """

    # Устанавливает уровень логирования 3 (ERROR) для TensorFlow.
    os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
    
    # Отключает аналитику Gradio.
    os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"

    # Устанавливает уровень логирования WARNING для различных библиотек и модулей.
    logging.getLogger("pydub").setLevel(logging.WARNING)
    logging.getLogger("numba").setLevel(logging.WARNING)
    logging.getLogger("faiss").setLevel(logging.WARNING)
    logging.getLogger("torio").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("matplotlib").setLevel(logging.WARNING)
    logging.getLogger("python_multipart").setLevel(logging.WARNING)



# Пример использования функции configure_logging в основном файле:
# from logging_config import configure_logging
# configure_logging()
