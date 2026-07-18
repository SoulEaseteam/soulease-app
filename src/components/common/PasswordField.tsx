// src/components/common/PasswordField.tsx
//
// 🆕 Round 28x.79 (founder: "ปิดตาดูรหัสได้") — a password field with a
// show/hide toggle. Shared because it now needs to appear in six places
// (customer + staff login, register, and the three change-password fields)
// and a copy-pasted eye icon is how one of the six quietly drifts.

import React, { useState } from "react";
import { TextField, IconButton, InputAdornment, type TextFieldProps } from "@mui/material";
import { Eye, EyeSlash } from "phosphor-react";

export type PasswordFieldProps = Omit<TextFieldProps, "type">;

const PasswordField: React.FC<PasswordFieldProps> = ({ sx, InputProps, ...props }) => {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? "text" : "password"}
      sx={sx}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label={visible ? "Hide password" : "Show password"}
              onClick={() => setVisible((v) => !v)}
              edge="end"
              size="small"
              tabIndex={-1}
            >
              {visible ? <EyeSlash size={18} /> : <Eye size={18} />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PasswordField;
