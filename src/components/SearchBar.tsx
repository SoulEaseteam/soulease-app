import React, { useState, useEffect, useRef } from 'react';
import { Box, InputBase, IconButton, Fade } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface SearchBarProps {
  onSearch: (term: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = 'Search name...',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debounceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    debounceTimeout.current = setTimeout(() => {
      onSearch(searchTerm.trim());
    }, 300);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [searchTerm, onSearch]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        px: 3,
        py: 1,
        mt: 4,
        mx: 'auto',
        maxWidth: '70%',
        width: '100%',
        borderRadius: 99,
        background: '#2b3b53',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 6px 16px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        fontFamily: 'Trebuchet MS, sans-serif',
        '&:focus-within': {
          borderColor: '#88ccff',
          boxShadow: '0 0 0 2px rgba(136,204,255,0.2)',
        },
      }}
    >
      <SearchIcon sx={{ color: '#fff', fontSize: 22, opacity: 0.8 }} aria-label="search" />

      <InputBase
        placeholder={placeholder}
        value={searchTerm}
        onChange={handleChange}
        sx={{
          ml: 1.5,
          flex: 1,
          fontSize: 15,
          color: '#fff',
          fontFamily: 'Trebuchet MS, sans-serif',
          '&::placeholder': {
            color: '#bbb',
            opacity: 0.7,
            fontStyle: 'italic',
          },
        }}
        inputProps={{ style: { caretColor: '#fff' } }}
      />

      <Fade in={!!searchTerm}>
        <IconButton
          size="small"
          aria-label="clear search"
          onClick={() => setSearchTerm('')}
          sx={{
            color: '#fff',
            bgcolor: 'rgba(255,255,255,0.15)',
            width: 26,
            height: 26,
            ml: 1,
            borderRadius: '50%',
            transition: '0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.25)',
              transform: 'scale(1.1)',
            },
          }}
        >
          ✕
        </IconButton>
      </Fade>
    </Box>
  );
};

export default SearchBar;