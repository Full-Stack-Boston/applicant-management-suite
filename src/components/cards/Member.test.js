import React from 'react';
import { render, screen } from '@testing-library/react';
import { Member } from './Member';
import { useTheme } from '../../context/ThemeContext';
import { useAlert } from '../../context/AlertContext';
import { useConfig } from '../../context/ConfigContext';

vi.mock('react-router-dom', async () => ({
	...(await vi.importActual('react-router-dom')),
	useNavigate: jest.fn(),
}));

vi.mock('../../context/ThemeContext', () => ({
	useTheme: jest.fn(),
}));

vi.mock('../../context/AlertContext', () => ({
	useAlert: jest.fn(),
}));

vi.mock('../../context/ConfigContext', () => ({
	useConfig: jest.fn(),
}));

vi.mock('../../hooks/useAssetActionHandler', () => ({
	__esModule: true,
	useAssetActionHandler: jest.fn(() => jest.fn()),
}));

vi.mock('../../config/ui/buttonActions', () => ({
	__esModule: true,
	getMemberActions: jest.fn(() => []),
}));

vi.mock('../../config/navigation/routeUtils', () => ({
	__esModule: true,
	generatePath: jest.fn(),
}));

vi.mock('../../config/navigation/paths', () => ({
	__esModule: true,
	paths: { editMember: 'edit' },
}));

vi.mock('../../config/ui/tableConfig', () => ({
	__esModule: true,
	UserLastLogin: () => <span>2 days ago</span>,
	UserLastSeen: () => <span>Recently</span>,
}));

vi.mock('../../config/ui/formConfig', () => ({
	__esModule: true,
	memberFormConfig: { fields: [] },
}));

vi.mock('../layout/SingleAssetPage', () => ({
	__esModule: true,
	default: ({ children }) => <div>{children}</div>,
	AssetCard: ({ children }) => <div>{children}</div>,
}));

vi.mock('../assets/AssetProfileSection', () => ({
	__esModule: true,
	default: ({ displayName, footerMeta }) => (
		<div>
			<h1>{displayName}</h1>
			{footerMeta}
		</div>
	),
}));

vi.mock('../assets/AssetSectionHeader', () => ({ default: ({ title }) => <h2>{title}</h2> }));
vi.mock('../forms/PermissionGroup', () => ({ default: () => <div>PermissionGroup</div> }));
vi.mock('../notes/MyNotes', () => ({ default: () => <div>MyNotes</div> }));

describe('Member Card', () => {
	const mockMember = {
		id: 'mem123',
		firstName: 'Alice',
		lastName: 'Admin',
		email: 'alice@example.com',
		permissions: {},
	};

	beforeEach(() => {
		jest.clearAllMocks();
		useTheme.mockReturnValue({ darkMode: false });
		useAlert.mockReturnValue({ showAlert: jest.fn(), handleError: jest.fn() });
		useConfig.mockReturnValue({});
	});

	test('renders member name and presence footer', () => {
		render(<Member member={mockMember} />);
		expect(screen.getByText('Alice')).toBeInTheDocument();
		expect(screen.getByText(/Last seen/i)).toBeInTheDocument();
		expect(screen.getByText('Recently')).toBeInTheDocument();
		expect(screen.getByText(/Last login/i)).toBeInTheDocument();
		expect(screen.getByText('2 days ago')).toBeInTheDocument();
	});

	test('renders permissions group', () => {
		render(<Member member={mockMember} />);
		expect(screen.getByText('PermissionGroup')).toBeInTheDocument();
	});
});
