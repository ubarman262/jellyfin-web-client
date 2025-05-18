# Jellyfin Web Client

## 💖 Support Me

If you find this project useful, consider supporting its development:

 [<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" width="150" />](https://buymeacoffee.com/ujjwalbarman)
⭐ Star this repository on GitHub

---

A modern, fast, beautiful web client for [Jellyfin](https://jellyfin.org/) built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **Authentication:** Secure login to your Jellyfin server.
- **Browse Media:** Explore movies, TV shows, and latest additions.
- **Search:** Fast, responsive search for movies, shows, and people.
- **Media Details:** Rich details for each media item.
- **Playback:** Stream media with HLS, audio/subtitle track selection, and resume support.
- **Subtitles:** Integrated subtitle display and selection.
- **Responsive UI:** Works great on desktop and mobile.
- **Modern Design:** Clean, production-ready UI with Tailwind CSS and Lucide icons.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)

### Installation

1. **Clone the repository:**

   ```sh
   git clone https://github.com/yourusername/jellyfin-web-client.git
   cd jellyfin-web-client
   ```

2. **Install dependencies:**

   ```sh
   npm install
   # or
   yarn install
   ```

3. **Start the development server:**

   ```sh
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser and go to:**
   ```
   http://localhost:5173
   ```

## Usage

- On first launch, enter your Jellyfin server URL (including `http://` or `https://`), username, and password.
- Browse, search, and play your media!

## Project Structure

- `src/` - Main source code
  - `api/` - Jellyfin API integration
  - `components/` - UI components
  - `context/` - React context (auth, etc.)
  - `hooks/` - Custom React hooks
  - `pages/` - Route pages (Home, Login, Movies, Shows, Search, Player, etc.)
  - `types/` - TypeScript types
  - `utils/` - Utility functions

## Customization

- **UI:** Tailwind CSS for easy theming and customization.
- **Icons:** Uses [Lucide React](https://lucide.dev/) for icons.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Lint code with ESLint

## License

[MIT](LICENSE)

---

**Not affiliated with Jellyfin.**  
For more information about Jellyfin, visit [jellyfin.org](https://jellyfin.org/).
