import { useTheme } from "../context/ThemeContext";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="
    p-2 rounded-lg border 
    border-gray-300 dark:border-gray-600
    bg-white dark:bg-gray-800
    hover:bg-gray-100 dark:hover:bg-gray-700
    transition-all duration-200
  "
    >
      {darkMode ? (
        <Sun size={18} className="text-yellow-400 drop-shadow-sm" />
      ) : (
        <Moon size={18} className="text-gray-700 dark:text-gray-300" />
      )}
    </button>
  );
};

export default ThemeToggle;