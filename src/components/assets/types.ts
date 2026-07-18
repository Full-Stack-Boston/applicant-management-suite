import type { ElementType, ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material';
import type { AssetAction, AssetRecord } from '../../hooks/useAssetActionHandler';

export interface AssetConfig {
	DEFAULT_AVATAR?: string;
}

export type { AssetAction, AssetRecord };

export interface DetailGridItem {
	label: string;
	value?: ReactNode;
	icon: ElementType;
}

export interface InfoTableRow {
	label: string;
	value?: ReactNode;
}

export interface DynamicAction extends AssetAction {
	label: string;
	hide?: boolean;
	onClick?: (asset?: AssetRecord) => void;
}

export interface AssetProfileSectionProps {
	sectionTitle?: string;
	showBackButton?: boolean;
	onBack?: () => void;
	image?: string;
	displayName?: string;
	status?: string;
	config?: AssetConfig;
	details: DetailGridItem[];
	footerMeta?: ReactNode;
	actions?: DynamicAction[];
	asset?: AssetRecord;
	onAction?: (action: DynamicAction, asset: AssetRecord) => void | Promise<void>;
	functionsTitle?: string;
	functions?: ReactNode;
	editPath?: string;
}

export interface AssetSectionHeaderProps {
	title: string;
	endAdornment?: ReactNode;
	showDivider?: boolean;
	showBackButton?: boolean;
	onBack?: () => void;
	sx?: SxProps<Theme>;
}

export interface ApplicationDetailGridProps {
	items: DetailGridItem[];
	fullWidth?: boolean;
}

export interface HeaderProps {
	image?: string;
	title?: string;
	status?: string;
	editPath?: string;
	config?: AssetConfig;
	children?: ReactNode;
	compact?: boolean;
}

export interface SectionProps {
	title?: string;
	children: ReactNode;
}

export interface InfoTableProps {
	data: InfoTableRow[];
}

export interface UserActivityFooterProps {
	userId?: string;
}
