import type { Meta, StoryObj } from '@storybook/react';
import { TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import { DataTable } from './DataTable';
import { Column, BulkAction } from '../../types/dataTable';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  lastLogin: Date;
  age: number;
}

const sampleData: User[] = Array.from({ length: 50 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: ['Admin', 'User', 'Moderator'][i % 3],
  status: i % 3 === 0 ? 'inactive' : 'active',
  lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  age: 20 + Math.floor(Math.random() * 40),
}));

const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    filterable: true,
    width: 200,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
    filterable: true,
    width: 250,
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    filterable: true,
    width: 120,
    render: (value) => (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Admin'
            ? 'bg-purple-100 text-purple-800'
            : value === 'Moderator'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    filterable: true,
    width: 100,
    render: (value) => (
      <span
        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'active'
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {value}
      </span>
    ),
  },
  {
    key: 'age',
    header: 'Age',
    sortable: true,
    width: 80,
  },
  {
    key: 'lastLogin',
    header: 'Last Login',
    sortable: true,
    width: 150,
    render: (value) => new Date(value).toLocaleDateString(),
  },
];

const bulkActions: BulkAction<User>[] = [
  {
    id: 'activate',
    label: 'Activate Users',
    action: async (selectedUsers) => {
      console.log('Activating users:', selectedUsers);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
  {
    id: 'deactivate',
    label: 'Deactivate Users',
    action: async (selectedUsers) => {
      console.log('Deactivating users:', selectedUsers);
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
  },
  {
    id: 'edit',
    label: 'Edit Users',
    icon: <PencilIcon className="w-4 h-4" />,
    action: (selectedUsers) => {
      console.log('Editing users:', selectedUsers);
    },
  },
  {
    id: 'delete',
    label: 'Delete Users',
    icon: <TrashIcon className="w-4 h-4" />,
    dangerous: true,
    action: async (selectedUsers) => {
      console.log('Deleting users:', selectedUsers);
      await new Promise(resolve => setTimeout(resolve, 1500));
    },
  },
];

const meta: Meta<typeof DataTable> = {
  title: 'Components/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    data: { control: { disable: true } },
    columns: { control: { disable: true } },
    bulkActions: { control: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<typeof DataTable>;

export const Default: Story = {
  args: {
    data: sampleData.slice(0, 10),
    columns,
  },
};

export const WithSorting: Story = {
  args: {
    data: sampleData.slice(0, 15),
    columns,
    sortable: true,
    defaultSort: { column: 'name', direction: 'asc' },
  },
};

export const WithFiltering: Story = {
  args: {
    data: sampleData.slice(0, 20),
    columns,
    filterable: true,
  },
};

export const WithPagination: Story = {
  args: {
    data: sampleData,
    columns,
    pagination: true,
    paginationState: {
      page: 0,
      pageSize: 10,
      totalItems: sampleData.length,
      totalPages: Math.ceil(sampleData.length / 10),
    },
  },
};

export const WithSelection: Story = {
  args: {
    data: sampleData.slice(0, 15),
    columns,
    selectable: true,
  },
};

export const WithBulkActions: Story = {
  args: {
    data: sampleData.slice(0, 20),
    columns,
    selectable: true,
    bulkActions,
  },
};

export const WithVirtualization: Story = {
  args: {
    data: sampleData,
    columns,
    virtual: true,
    virtualHeight: 400,
    rowHeight: 56,
  },
};

export const FullFeatured: Story = {
  args: {
    data: sampleData,
    columns,
    sortable: true,
    filterable: true,
    pagination: true,
    selectable: true,
    bulkActions,
    paginationState: {
      page: 0,
      pageSize: 10,
      totalItems: sampleData.length,
      totalPages: Math.ceil(sampleData.length / 10),
    },
    defaultSort: { column: 'name', direction: 'asc' },
  },
};

export const Loading: Story = {
  args: {
    data: [],
    columns,
    loading: true,
  },
};

export const Empty: Story = {
  args: {
    data: [],
    columns,
    emptyMessage: 'No users found',
  },
};

export const WithError: Story = {
  args: {
    data: [],
    columns,
    error: 'Failed to load user data',
  },
};

export const CustomRowRendering: Story = {
  args: {
    data: sampleData.slice(0, 10),
    columns: [
      ...columns,
      {
        key: 'actions' as keyof User,
        header: 'Actions',
        render: (_, row) => (
          <div className="flex space-x-2">
            <button
              onClick={() => console.log('Edit user:', row)}
              className="text-blue-600 hover:text-blue-500"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => console.log('Delete user:', row)}
              className="text-red-600 hover:text-red-500"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        ),
      },
    ],
  },
};

export const CompactTable: Story = {
  args: {
    data: sampleData.slice(0, 20),
    columns,
    rowHeight: 40,
    tableClassName: 'text-sm',
    rowClassName: 'hover:bg-gray-25',
  },
};

export const LargeDatasetVirtual: Story = {
  args: {
    data: Array.from({ length: 10000 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ['Admin', 'User', 'Moderator'][i % 3],
      status: (i % 3 === 0 ? 'inactive' : 'active') as 'active' | 'inactive',
      lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      age: 20 + Math.floor(Math.random() * 40),
    })),
    columns,
    virtual: true,
    virtualHeight: 500,
    rowHeight: 48,
    sortable: true,
    filterable: true,
  },
};
