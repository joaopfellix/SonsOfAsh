const OLLAMA_CHAT_URL =
    "http://127.0.0.1:11434/api/chat";

const OLLAMA_TAGS_URL =
    "http://127.0.0.1:11434/api/tags";

const TEXT_MODEL =
    "Sons.Of.Ash:latest";

const VISION_MODEL =
    "qwen2.5vl:3b";

let conversation = [];
let controller = null;
let isGenerating = false;

let selectedImage = null;

const chat =
    document.getElementById("chat");

const messageInput =
    document.getElementById("message");

const sendButton =
    document.getElementById("send");

const stopButton =
    document.getElementById("stop");

const newChatButton =
    document.getElementById("new-chat");

const thinking =
    document.getElementById("thinking");

const ollamaStatus =
    document.getElementById("ollama-status");

const statusText =
    document.getElementById("status-text");


/* =========================================
   ELEMENTOS DE IMAGEM
========================================= */

const attachButton =
    document.getElementById("attach");

const fileInput =
    document.getElementById("file-input");

const attachmentArea =
    document.getElementById("attachment-area");

const imagePreview =
    document.getElementById("image-preview");

const filePreview =
    document.getElementById("file-preview");

const fileName =
    document.getElementById("file-name");

const fileSize =
    document.getElementById("file-size");

const removeAttachment =
    document.getElementById("remove-attachment");


function escapeHTML(text) {

    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function renderMarkdown(text) {

    let html = escapeHTML(text);

    const codeBlocks = [];

    html = html.replace(
        /```([\w+-]*)\n?([\s\S]*?)```/g,
        function(match, language, code) {

            const index =
                codeBlocks.length;

            codeBlocks.push({
                language:
                    language || "code",
                code
            });

            return `@@CODEBLOCK_${index}@@`;
        }
    );

    html = html.replace(
        /^### (.*)$/gm,
        "<h3>$1</h3>"
    );

    html = html.replace(
        /^## (.*)$/gm,
        "<h2>$1</h2>"
    );

    html = html.replace(
        /^# (.*)$/gm,
        "<h1>$1</h1>"
    );

    html = html.replace(
        /^\- (.*)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /^\* (.*)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    html = html.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );

    html = html.replace(
        /\n/g,
        "<br>"
    );

    html = html.replace(
        /(<li>.*?<\/li>)(?:<br>)?/g,
        "$1"
    );

    html = html.replace(
        /(<li>.*?<\/li>)+/g,
        match =>
            "<ul>" +
            match.replace(/<br>/g, "") +
            "</ul>"
    );

    codeBlocks.forEach(
        function(block, index) {

            const codeHTML = `
                <div class="code-wrapper">

                    <div class="code-header">

                        <span>
                            ${escapeHTML(block.language)}
                        </span>

                        <button
                            class="copy-code"
                            data-code="${encodeURIComponent(block.code)}"
                        >
                            📋 Copiar
                        </button>

                    </div>

                    <pre><code>${escapeHTML(block.code)}</code></pre>

                </div>
            `;

            html =
                html.replace(
                    `@@CODEBLOCK_${index}@@`,
                    codeHTML
                );
        }
    );

    return html;
}


document.addEventListener(
    "click",
    async function(event) {

        const button =
            event.target.closest(".copy-code");

        if (!button) return;

        try {

            const code =
                decodeURIComponent(
                    button.dataset.code
                );

            await navigator.clipboard.writeText(
                code
            );

            const oldText =
                button.textContent;

            button.textContent =
                "✓ Copiado";

            setTimeout(
                function() {
                    button.textContent =
                        oldText;
                },
                1500
            );

        } catch (error) {

            console.error(
                "Erro ao copiar:",
                error
            );
        }
    }
);


function addMessage(
    role,
    content,
    streaming = false
) {

    const message =
        document.createElement("div");

    message.className =
        "message " +
        (
            role === "user"
                ? "user-message"
                : "ai-message assistant-message"
        );

    const bubble =
        document.createElement("div");

    bubble.className =
        "message-bubble";

    if (
        role === "assistant" &&
        streaming
    ) {

        bubble.classList.add(
            "streaming"
        );

        bubble.innerHTML =
            '<span class="stream-cursor"></span>';

    } else {

        bubble.innerHTML =
            renderMarkdown(content);
    }

    message.appendChild(bubble);

    chat.appendChild(message);

    chat.scrollTop =
        chat.scrollHeight;

    return bubble;
}


function setThinking(active) {

    if (!thinking) return;

    thinking.style.display =
        active ? "flex" : "none";
}


function setOllamaOnline() {

    if (!ollamaStatus) return;

    ollamaStatus.classList.remove(
        "offline",
        "connecting"
    );

    ollamaStatus.classList.add(
        "online"
    );

    if (statusText) {

        statusText.textContent =
            "OLLAMA ONLINE";
    }
}


function setOllamaOffline() {

    if (!ollamaStatus) return;

    ollamaStatus.classList.remove(
        "online",
        "connecting"
    );

    ollamaStatus.classList.add(
        "offline"
    );

    if (statusText) {

        statusText.textContent =
            "OLLAMA OFFLINE";
    }
}


function setOllamaConnecting() {

    if (!ollamaStatus) return;

    ollamaStatus.classList.remove(
        "online",
        "offline"
    );

    ollamaStatus.classList.add(
        "connecting"
    );

    if (statusText) {

        statusText.textContent =
            "CONECTANDO...";
    }
}


async function checkOllamaStatus() {

    setOllamaConnecting();

    try {

        const response =
            await fetch(
                OLLAMA_TAGS_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }

        await response.json();

        setOllamaOnline();

        return true;

    } catch (error) {

        console.error(
            "Ollama offline:",
            error
        );

        setOllamaOffline();

        return false;
    }
}


/* =========================================
   IMAGEM
========================================= */

function fileToBase64(file) {

    return new Promise(
        function(resolve, reject) {

            const reader =
                new FileReader();

            reader.onload =
                function() {

                    const result =
                        reader.result;

                    const base64 =
                        result.split(",")[1];

                    resolve(base64);
                };

            reader.onerror =
                function() {

                    reject(
                        new Error(
                            "Não foi possível ler a imagem."
                        )
                    );
                };

            reader.readAsDataURL(file);
        }
    );
}


function formatFileSize(bytes) {

    if (bytes < 1024) {

        return bytes + " B";
    }

    if (bytes < 1024 * 1024) {

        return (
            (bytes / 1024).toFixed(1) +
            " KB"
        );
    }

    return (
        (bytes / (1024 * 1024)).toFixed(1) +
        " MB"
    );
}


function showImageAttachment(file) {

    if (!file) return;

    if (
        !file.type ||
        !file.type.startsWith("image/")
    ) {

        alert(
            "Selecione somente uma imagem."
        );

        return;
    }

    selectedImage =
        file;

    if (attachmentArea) {

        attachmentArea.classList.remove(
            "hidden"
        );
    }

    if (imagePreview) {

        imagePreview.src =
            URL.createObjectURL(file);

        imagePreview.classList.remove(
            "hidden"
        );
    }

    if (filePreview) {

        filePreview.classList.add(
            "hidden"
        );
    }

    if (fileName) {

        fileName.textContent =
            file.name ||
            "imagem";
    }

    if (fileSize) {

        fileSize.textContent =
            formatFileSize(
                file.size
            );
    }
}


function clearAttachment() {

    selectedImage =
        null;

    if (imagePreview) {

        imagePreview.src =
            "";

        imagePreview.classList.add(
            "hidden"
        );
    }

    if (filePreview) {

        filePreview.classList.add(
            "hidden"
        );
    }

    if (attachmentArea) {

        attachmentArea.classList.add(
            "hidden"
        );
    }

    if (fileInput) {

        fileInput.value =
            "";
    }
}


/* =========================================
   BOTÃO DE ANEXAR
========================================= */

if (attachButton) {

    attachButton.addEventListener(
        "click",
        function() {

            if (isGenerating) return;

            if (fileInput) {

                fileInput.click();
            }
        }
    );
}


/* =========================================
   ARQUIVO SELECIONADO
========================================= */

if (fileInput) {

    fileInput.addEventListener(
        "change",
        function() {

            const file =
                fileInput.files &&
                fileInput.files[0];

            if (!file) return;

            showImageAttachment(file);
        }
    );
}


/* =========================================
   REMOVER IMAGEM
========================================= */

if (removeAttachment) {

    removeAttachment.addEventListener(
        "click",
        function() {

            clearAttachment();
        }
    );
}


/* =========================================
   CTRL + V — IMAGEM
========================================= */

if (messageInput) {

    messageInput.addEventListener(
        "paste",
        function(event) {

            const items =
                event.clipboardData &&
                event.clipboardData.items;

            if (!items) return;

            for (
                let i = 0;
                i < items.length;
                i++
            ) {

                const item =
                    items[i];

                if (
                    item.kind === "file" &&
                    item.type.startsWith("image/")
                ) {

                    const file =
                        item.getAsFile();

                    if (file) {

                        showImageAttachment(
                            file
                        );
                    }

                    event.preventDefault();

                    break;
                }
            }
        }
    );
}


/* =========================================
   STREAM DO OLLAMA
========================================= */

async function readOllamaStream(
    response,
    bubble
) {

    if (!response.body) {

        throw new Error(
            "Ollama não retornou stream."
        );
    }

    const reader =
        response.body.getReader();

    const decoder =
        new TextDecoder("utf-8");

    let buffer = "";

    let fullText = "";

    while (true) {

        const {
            value,
            done
        } =
            await reader.read();

        if (done) break;

        buffer +=
            decoder.decode(
                value,
                {
                    stream: true
                }
            );

        const lines =
            buffer.split("\n");

        buffer =
            lines.pop() || "";

        for (
            const line of lines
        ) {

            if (!line.trim()) {
                continue;
            }

            let data;

            try {

                data =
                    JSON.parse(line);

            } catch (error) {

                console.warn(
                    "Chunk inválido:",
                    line
                );

                continue;
            }

            if (
                data.message &&
                typeof data.message.content ===
                    "string"
            ) {

                fullText +=
                    data.message.content;

            } else if (
                typeof data.response ===
                    "string"
            ) {

                fullText +=
                    data.response;
            }

            bubble.innerHTML =
                renderMarkdown(
                    fullText
                ) +
                '<span class="stream-cursor"></span>';

            chat.scrollTop =
                chat.scrollHeight;
        }
    }

    bubble.innerHTML =
        renderMarkdown(fullText);

    bubble.classList.remove(
        "streaming"
    );

    return fullText;
}


/* =========================================
   ENVIAR MENSAGEM
========================================= */

async function sendMessage() {

    if (isGenerating) return;

    const text =
        messageInput
            ? messageInput.value.trim()
            : "";

    const hasImage =
        !!selectedImage;

    if (
        !text &&
        !hasImage
    ) return;

    const online =
        await checkOllamaStatus();

    if (!online) {

        alert(
            "Ollama não está disponível."
        );

        return;
    }

    isGenerating = true;

    controller =
        new AbortController();

    if (sendButton) {

        sendButton.disabled =
            true;
    }

    if (stopButton) {

        stopButton.disabled =
            false;
    }

    setThinking(true);


    /* =====================================
       NOVA FUNÇÃO:
       MENSAGEM COM IMAGEM
    ===================================== */

    if (hasImage) {

        try {

            const image =
                selectedImage;

            const imageBase64 =
                await fileToBase64(
                    image
                );


            addMessage(
                "user",
                text ||
                "Analise esta imagem."
            );


            const userMessage = {

                role: "user",

                content:
                    text ||
                    "Analise esta imagem.",

                images: [
                    imageBase64
                ]
            };


            conversation.push(
                userMessage
            );


            const bubble =
                addMessage(
                    "assistant",
                    "",
                    true
                );


            const response =
                await fetch(
                    OLLAMA_CHAT_URL,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body:
                            JSON.stringify({

                                model:
                                    VISION_MODEL,

                                messages:
                                    conversation,

                                stream:
                                    true
                            }),

                        signal:
                            controller.signal
                    }
                );


            if (!response.ok) {

    const errorText =
        await response.text();

    console.error(
        "ERRO COMPLETO DO OLLAMA:",
        errorText
    );

    throw new Error(
        "Ollama retornou HTTP " +
        response.status +
        ": " +
        errorText
    );
}


            const assistantText =
                await readOllamaStream(
                    response,
                    bubble
                );


            conversation.push({

                role: "assistant",

                content:
                    assistantText
            });


            clearAttachment();

            messageInput.value =
                "";


        } catch (error) {

            if (
                error.name ===
                "AbortError"
            ) {

                addMessage(
                    "assistant",
                    "⛔ Geração interrompida."
                );

            } else {

                console.error(
                    "Erro no Ollama:",
                    error
                );

                addMessage(
                    "assistant",
                    `<strong>❌ Erro</strong><br><br>${escapeHTML(error.message)}`
                );
            }

        } finally {

            isGenerating =
                false;

            controller =
                null;

            setThinking(false);

            if (sendButton) {

                sendButton.disabled =
                    false;
            }

            if (stopButton) {

                stopButton.disabled =
                    true;
            }

            chat.scrollTop =
                chat.scrollHeight;
        }

        return;
    }


    /* =====================================
       CÓDIGO ORIGINAL — TEXTO
       NÃO ALTERADO
    ===================================== */

    addMessage(
        "user",
        text
    );

    messageInput.value = "";

    conversation.push({
        role: "user",
        content: text
    });

    const bubble =
        addMessage(
            "assistant",
            "",
            true
        );

    try {

        const response =
            await fetch(
                OLLAMA_CHAT_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        model:
                            TEXT_MODEL,

                        messages:
                            conversation,

                        stream:
                            true
                    }),

                    signal:
                        controller.signal
                }
            );

        if (!response.ok) {

            throw new Error(
                "Ollama retornou HTTP " +
                response.status
            );
        }

        const assistantText =
            await readOllamaStream(
                response,
                bubble
            );

        conversation.push({
            role: "assistant",
            content:
                assistantText
        });

    } catch (error) {

        if (
            error.name ===
            "AbortError"
        ) {

            bubble.innerHTML =
                '<span class="stopped">⛔ Geração interrompida.</span>';

        } else {

            console.error(
                "Erro no Ollama:",
                error
            );

            bubble.innerHTML =
                `<strong>❌ Erro</strong><br><br>${escapeHTML(error.message)}`;

            if (
                conversation.length &&
                conversation[
                    conversation.length - 1
                ].role === "user"
            ) {

                conversation.pop();
            }
        }

    } finally {

        isGenerating =
            false;

        controller =
            null;

        setThinking(false);

        if (sendButton) {

            sendButton.disabled =
                false;
        }

        if (stopButton) {

            stopButton.disabled =
                true;
        }

        chat.scrollTop =
            chat.scrollHeight;
    }
}


if (stopButton) {

    stopButton.addEventListener(
        "click",
        function() {

            if (
                controller &&
                isGenerating
            ) {

                controller.abort();
            }
        }
    );
}


if (newChatButton) {

    newChatButton.addEventListener(
        "click",
        function() {

            if (
                isGenerating &&
                controller
            ) {

                controller.abort();
            }

            conversation = [];

            messageInput.value = "";

            clearAttachment();

            chat.innerHTML = "";

            setThinking(false);

            isGenerating =
                false;

            messageInput.focus();
        }
    );
}


if (messageInput) {

    messageInput.addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();
            }
        }
    );
}


if (sendButton) {

    sendButton.addEventListener(
        "click",
        sendMessage
    );
}


document.addEventListener(
    "DOMContentLoaded",
    function() {

        checkOllamaStatus();

        if (stopButton) {

            stopButton.disabled =
                true;
        }

        if (thinking) {

            thinking.style.display =
                "none";
        }

        if (messageInput) {

            messageInput.focus();
        }

        console.log(
            "================================="
        );

        console.log(
            "SONS.OF.ASH INICIADO"
        );

        console.log(
            "Modelo:",
            TEXT_MODEL
        );

        console.log(
            "Modelo visão:",
            VISION_MODEL
        );

        console.log(
            "Ollama:",
            OLLAMA_CHAT_URL
        );

        console.log(
            "================================="
        );
    }
);