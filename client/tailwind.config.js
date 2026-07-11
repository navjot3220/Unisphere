/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17153A",
        paper: "#F4F5FA",
        violet2: "#5B3DF5",
        marigold: "#FFC53D",
        leaf: "#0FA47A",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,21,58,.06), 0 8px 24px rgba(23,21,58,.08)",
      },
    },
  },
  plugins: [],
};
