// src/components/SearchBar.tsx
import React, { useState, useRef, useEffect } from "react";
import { Box, InputBase, IconButton, Fade } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { motion, useScroll, useTransform } from "framer-motion";

interface Props {
  onSearch: (term: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<Props> = ({ onSearch, placeholder = "search name..." }) => {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** parallax effect while scrolling */
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 200], [0, -12]);

  /** debounce search */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(text.trim());
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  return (
    <motion.div
      style={{
        y: parallaxY,
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginTop: 24,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: focused ? 3.2 : 2.6,
          py: focused ? 1.4 : 1.2,
          width: focused ? "84%" : "70%",
          transition: "all 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)",
          background: "rgba(255,255,255,0.55)",
          borderRadius: 99,
          backdropFilter: "blur(14px)",
          boxShadow:
            "0 6px 16px rgba(0,0,0,0.08), inset 0 1px 2px rgba(255,255,255,0.4)",
          border: focused
            ? "1px solid rgba(255,255,255,0.6)"
            : "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <SearchIcon sx={{ color: "#aaa" }} />

        <InputBase
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          sx={{
            ml: 1.2,
            flex: 1,
            fontSize: 15.5,
            color: "#444",
            "&::placeholder": {
              color: "#bbb",
              opacity: 1,
            },
          }}
        />

        <Fade in={!!text}>
          <IconButton
            size="small"
            onClick={() => setText("")}
            sx={{
              color: "#666",
              width: 26,
              height: 26,
              ml: 0.5,
              borderRadius: "50%",
              "&:hover": { background: "rgba(0,0,0,0.05)" },
            }}
          >
            ✕
          </IconButton>
        </Fade>
      </Box>
    </motion.div>
  );
};

export default SearchBar;