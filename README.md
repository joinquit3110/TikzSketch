<div align="center">

# 🎨 TikzSketch

<img src="./public/logo.png" alt="" width="120" height="120" style="border-radius: 20px;">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

</div>

---

## ✨ Features

### 🎯 **Drawing Tools**
- 📍 **Point** - Create precise coordinate points
- 📏 **Line** - Draw straight lines and segments  
- ⬜ **Rectangle** - Create rectangular shapes
- ⭕ **Circle** - Draw perfect circles
- 🔺 **Polygon** - Create custom polygons
- 📝 **Text** - Add LaTeX-formatted text labels

### 🔧 **Construction Tools**
- ⊥ **Perpendicular** - Construct perpendicular lines
- ∥ **Parallel** - Create parallel line constructions
- ⚬ **Midpoint** - Find midpoints automatically
- ∠ **Angle** - Measure and display angles
- 📐 **Distance** - Measure distances between points
- ⚡ **Perpendicular Bisector** - Construct perpendicular bisectors

### 🎨 **Advanced Features**
- 🎯 **Interactive Canvas** - Powered by Konva.js for smooth interactions
- 📊 **Properties Panel** - Real-time property editing
- 🔧 **Code Output** - Generate clean TikZ LaTeX code
- ↩️ **Undo/Redo** - Full history management
- ⌨️ **Keyboard Shortcuts** - Efficient workflow
- 🎨 **Modern UI** - Beautiful interface with Tailwind CSS

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/joinquit3110/TikzSketch.git

# Navigate to project directory
cd TikzSketch

# Install dependencies
npm install

# Start development server
npm run dev
```

🌐 Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## 🎮 How to Use

### Basic Drawing
1. **Select a tool** from the toolbar (or use keyboard shortcuts)
2. **Click on the canvas** to create objects
3. **Drag to move** objects around
4. **Select objects** to edit properties

### Keyboard Shortcuts

| Key | Tool       | Key | Action |
|-----|------|-----|--------|
| `V` | 🎯 Select    | `Ctrl+Z` | ↩️ Undo |
| `P` | 📍 Point     | `Ctrl+Y` | ↪️ Redo |
| `L` | 📏 Line      | `Ctrl+A` | 🎯 Select All |
| `R` | ⬜ Rectangle | `Delete` | 🗑️ Delete |
| `C` | ⭕ Circle    | `Escape` | ❌ Cancel         |
| `G` | 🔺 Polygon   | `Enter`  | ✅ Finish Polygon |
| `T` | 📝 Text      |          |                   |

### Advanced Constructions
- `Q` - ⊥ Perpendicular lines
- `E` - ∥ Parallel constructions  
- `M` - ⚬ Midpoint finder
- `N` - ∠ Angle measurements
- `D` - 📐 Distance calculator
- `B` - ⚡ Perpendicular bisector

---

## 🛠️ Tech Stack

<div align="center">

| Frontend | Styling | Canvas | Math | State |
|----------|---------|---------|------|--------|
| ⚛️ **React 19** | 🎨 **Tailwind CSS** | 🖼️ **Konva.js** | 📐 **KaTeX** | 🏪 **Zustand** |
| ⚡ **Next.js 15** | 🎯 **Radix UI** | 🖱️ **React-Konva** | 📊 **React-KaTeX** | 📝 **Immer** |

</div>

---

## 📁 Project Structure

```
tikzsketch/
├── 📁 src/
│   ├── 📁 app/           # Next.js app directory
│   ├── 📁 components/    # React components
│   │   ├── Canvas.tsx        # Main drawing canvas
│   │   ├── Toolbar.tsx       # Tool selection
│   │   ├── PropertiesPanel.tsx  # Object properties
│   │   ├── CodeOutput.tsx    # TikZ code generator
│   │   └── ui/              # UI components
│   └── 📁 lib/           # Utilities and state
│       ├── store.ts         # Zustand store
│       └── utils.ts         # Helper functions
├── 📁 public/            # Static assets
└── 📄 Configuration files
```

---

## 🎯 Output

TikzSketch generates clean, professional TikZ code:

```latex
\begin{tikzpicture}
  \coordinate (A) at (0,0);
  \coordinate (B) at (3,0);
  \coordinate (C) at (1.5,2.598);
  
  \draw (A) -- (B) -- (C) -- cycle;
  \fill [red!30] (A) -- (B) -- (C) -- cycle;
  
  \node at (A) [below left] {A};
  \node at (B) [below right] {B};
  \node at (C) [above] {C};
\end{tikzpicture}
```

---

## 🎨 Screenshots

> *Screenshots coming soon! The app features a modern, intuitive interface with a clean toolbar, interactive canvas, and real-time property editing.*

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 **Fork** the repository
2. 🌿 **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. 📤 **Push** to the branch (`git push origin feature/amazing-feature`)
5. 🔄 **Open** a Pull Request

---

## 📋 Roadmap

- [ ] 📱 Mobile responsiveness
- [ ] 💾 Save/Load projects
- [ ] 🔄 Real-time collaboration
- [ ] 📚 Template library
- [ ] 🎨 Custom themes
- [ ] 📤 Multiple export formats
- [ ] 🤖 AI-assisted drawing

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- 🎨 **Konva.js** - For the amazing canvas library
- 📐 **KaTeX** - For beautiful LaTeX rendering  
- 🎯 **Radix UI** - For accessible UI components
- ⚛️ **React & Next.js** - For the fantastic framework

---

<div align="center">

**Made with ❤️ and lots of ☕**

*Transform your mathematical ideas into beautiful TikZ diagrams!*

⭐ **Star this repo if you find it useful!** ⭐

</div> 