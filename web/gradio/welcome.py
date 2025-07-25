import gradio as gr


def welcome_tab():
    with gr.Column(variant="panel"):
        gr.HTML(
            """
        <center>
            <h1 style="font-size: 3em;">
                <b>Добро пожаловать в Mushroom RVC</b>
            </h1>
        </center>
        """
        )
        gr.HTML(
            """
        <center>
            <h2>
                <a href='https://github.com/Politrees-Kanoyo/Mushroom-RVC'>GitHub</a>
            </h2>
        </center>
        """
        )
