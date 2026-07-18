import type { GridProps } from '@mui/material';

/** Default two-column pairing for common auth form fields. */
export const authFieldGridSize = (name: string): GridProps['size'] => {
	switch (name) {
		case 'firstName':
		case 'lastName':
		case 'password':
		case 'confirmPassword':
		case 'position':
		case 'since':
			return { xs: 12, sm: 6 };
		default:
			return { xs: 12 };
	}
};
