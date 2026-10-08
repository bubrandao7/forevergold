import { pins, servir, tokenDe } from '../_shared/runtime.ts';
servir((req, b) => pins.definirPin(b, tokenDe(req), req.headers.get('user-agent')));
