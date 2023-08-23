import { encode } from 'gpt-tokenizer';

export default function getNTokens(input: string): number {
	const tokens = encode(input);
	return tokens.length;
}
