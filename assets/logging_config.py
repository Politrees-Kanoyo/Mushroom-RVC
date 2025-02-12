'''Настройка конфигурации логирования для различных библиотек и модулей.'''

import logging
import os
import warnings


def configure_logging(enable_configure_logging=True, global_logger=False, logging_level="WARNING"):
    """
    Эта функция устанавливает уровни логирования для различных библиотек и модулей,
    чтобы сократить количество выводимых сообщений и улучшить читаемость логов.

    Параметры:
    - enable_configure_logging (bool, optional):
        Главный переключатель для всей настройки логирования.
        Если установлен в False, функция не будет выполнять никаких действий.
      По умолчанию: True

    - global_logger (bool, optional):
        Флаг для включения или выключения глобального логгера.
        Если установлен в True, настраивает уровень логирования для всех логгеров.
        Если False, настраивает уровень логирования только для указанных библиотек.
      По умолчанию: False

    - logging_level (str, optional):
        Пользовательский уровень логирования.
        Должен быть одним из следующих: "DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL".
        Если указано некорректное значение, будет использовано значение по умолчанию "WARNING".
      По умолчанию: "WARNING"

    Уровни логирования:
    - 0 | DEBUG: Подробная информация, обычно интересная только при отладке проблем.
    - 1 | INFO: Подтверждение того, что все работает как ожидалось.
    - 2 | WARNING: Индикация того, что что-то неожиданное произошло, или индикация
               проблемы в ближайшем будущем (например, 'диск заполняется').
               Программа все еще работает как ожидалось.
    - 3 | ERROR: Из-за более серьезной проблемы программа не может выполнить некоторые функции.
    - 4 | CRITICAL: Указывает на то, что программа, возможно, не может продолжить выполнение.

    В этом случае мы устанавливаем уровень логирования WARNING для всех библиотек и модулей,
    чтобы игнорировать сообщения уровня DEBUG и INFO.
    """
    
    if enable_configure_logging:
        # ===== Настройка переменных окружения для зависимостей ===== #
        os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
        os.environ["GRADIO_ANALYTICS_ENABLED"] = "False"

        # ===== Обработка системных предупреждений ===== #
        warnings.filterwarnings("ignore", category=FutureWarning)
        warnings.filterwarnings("ignore", category=UserWarning)

        # Получаем уровень логирования из строки
        level = getattr(logging, logging_level, logging.WARNING)

        # ===== Настройка логгеров сторонних библиотек ===== #
        if global_logger:
            logging.basicConfig(level=level)
        else:
            logging.getLogger("pydub").setLevel(level)
            logging.getLogger("numba").setLevel(level)
            logging.getLogger("faiss").setLevel(level)
            logging.getLogger("torio").setLevel(level)
            logging.getLogger("httpx").setLevel(level)
            logging.getLogger("urllib3").setLevel(level)
            logging.getLogger("fairseq").setLevel(level)
            logging.getLogger("asyncio").setLevel(level)
            logging.getLogger("httpcore").setLevel(level)
            logging.getLogger("matplotlib").setLevel(level)
            logging.getLogger("python_multipart").setLevel(level)


# Пример использования функции configure_logging в основном файле:
# from logging_config import configure_logging
# configure_logging(enable_configure_logging=True, global_logger=True, logging_level="DEBUG")
