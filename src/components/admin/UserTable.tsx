import React from 'react';
import { Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UserTableProps {
  users: User[];
  onRowClick?: (id: string) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, onRowClick }) => {
  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Name</TableCell>
          <TableCell>Email</TableCell>
          <TableCell>Role</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {users.map((user) => (
          <TableRow
            key={user.id}
            hover
            onClick={() => onRowClick?.(user.id)}
            style={{ cursor: onRowClick ? 'pointer' : 'default' }}
          >
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default UserTable;