import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(pathToFileURL('./tests/mocks/svelte-loader.mjs').href, import.meta.url);
