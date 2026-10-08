import { pins, servir } from '../_shared/runtime.ts';
servir((_req, b) => pins.reporPin(b));
