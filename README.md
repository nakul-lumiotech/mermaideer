# 🧠 Mermaideer – AI‑Powered Mermaid Diagram Editor

**Mermaideer** is an interactive web app for creating, editing, and exporting [Mermaid](https://mermaid-js.github.io/) diagrams with the help of AI.

Built with **React + TypeScript + Vite**, it offers a sleek interface powered by **Monaco Editor**, modern UI components, and flexible AI integration. Whether you're diagramming workflows, architecture, or UML, Mermaideer streamlines your process from idea to export.

---

## ✨ Features

* 🎨 **Live Mermaid Diagram Preview**
* 🤖 **AI Prompt-to-Diagram Generation** (OpenAI, Anthropic, Gemini, OpenRouter)
* 🧠 **Code Suggestions** via Monaco Editor
* 🌓 **Light/Dark Mode Toggle**
* 📤 **Export to SVG, PNG, or PDF** in high resolution
* 🧭 **Local Storage for Persistence**
* 🪄 **Beautiful, Reusable UI Components** (built with ShadCN + TailwindCSS)
* 🎛️ **Customizable Canvas** with draggable panning and grid styles
* 📦 Minimal, Fast, and Extensible

---

## 📦 Tech Stack

| Area               | Tech Details            |
| ------------------ | ----------------------- |
| **Frontend**       | React, TypeScript, Vite |
| **Editor**         | Monaco Editor           |
| **Diagram Engine** | Mermaid.js              |
| **AI Assistant**   | OpenAI, Anthropic, Gemini, OpenRouter |
| **Styling**        | TailwindCSS, ShadCN UI  |
| **Export**         | html-to-image, jspdf    |
| **Notifications**  | Sonner (toasts)         |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/nakul-lumiotech/mermaideer.git
cd mermaideer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the App

```bash
npm run dev
```

App will be live at [http://localhost:5173](http://localhost:5173)

### 4. Configure API Key

Open the app, click the key icon, choose your provider, and enter the API key. Keys are stored locally in your browser.

---

## 🧠 How It Works

### 🧾 Code + Preview

The Monaco editor (like VS Code) provides Mermaid syntax highlighting and autocompletion. Changes instantly reflect in the preview pane.

### 🤖 AI Assistant

Enter a natural-language prompt like:

> "A Kubernetes cluster with 3 pods, a service, and ingress"

And get valid Mermaid code generated using your selected AI provider.

### 📤 Export Options

Use built-in buttons to export the rendered diagram as:

* SVG
* PNG
* PDF

---

## 📂 Project Structure

```
src/
│
├── components/           # UI and diagram components
│   ├── ui/               # Reusable UI (buttons, cards, etc.)
│   └── MermaidDiagramMaker.tsx
│
├── pages/
│   ├── Index.tsx         # Main diagram page
│   └── NotFound.tsx
│
├── lib/                  # Utility functions
│
├── App.tsx               # App entry point
└── index.css, main.tsx
```

---

## 🧩 Notable Components

| Component                   | Purpose                                      |
| --------------------------- | -------------------------------------------- |
| `MermaidDiagramMaker`       | Main editor + preview + export functionality |
| `use-toast.ts`              | Custom hook for showing toast notifications  |
| `toggle.tsx`                | Theme switcher (light/dark)                  |
| `toaster.tsx`, `sonner.tsx` | Notification system                          |

---

## 🛠️ Customization

* **Theme & Design Tokens**: Controlled via `tailwind.config.ts`
* **Mermaid Styles**: Update `index.css` with `.mermaid` custom styles
* **API Key**: Stored locally in your browser

---

## 📜 License

This project currently does not specify a license. Please add one (`LICENSE.md`) to enable reuse and contributions.

---

## 🤝 Contributing

1. Fork the repository
2. Create your branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request 🚀

---

## 🙌 Acknowledgments

* [Mermaid.js](https://mermaid-js.github.io/) – diagram rendering
* [Monaco Editor](https://microsoft.github.io/monaco-editor/) – in-browser code editor
* [OpenAI API](https://platform.openai.com), [Anthropic](https://www.anthropic.com), [Gemini](https://ai.google.dev/gemini-api), [OpenRouter](https://openrouter.ai) – prompt-to-code
* [Sonner](https://sonner.emilkowal.ski/) – elegant toast notifications

---
