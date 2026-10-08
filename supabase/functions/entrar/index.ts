import { pins, servir } from '../_shared/runtime.ts';
servir((req, b) => pins.entrar(b, req.headers.get('user-agent')));
