import LottieModule from 'lottie-react';

type LottieComponent = typeof import('lottie-react').default;

const resolveLottieComponent = (moduleValue: unknown): LottieComponent => {
	if (typeof moduleValue === 'function') {
		return moduleValue as LottieComponent;
	}

	const nestedDefault = (moduleValue as { default?: unknown })?.default;
	if (typeof nestedDefault === 'function') {
		return nestedDefault as LottieComponent;
	}

	if (nestedDefault && typeof nestedDefault === 'object') {
		const deepDefault = (nestedDefault as { default?: unknown }).default;
		if (typeof deepDefault === 'function') {
			return deepDefault as LottieComponent;
		}
	}

	return moduleValue as LottieComponent;
};

const Lottie = resolveLottieComponent(LottieModule);

export default Lottie;
