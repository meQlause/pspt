import { readFileSync } from 'node:fs';
import { Injectable } from '@nestjs/common';
import express from 'express';
export const isLate = (startsAt: number): boolean => Date.now() > startsAt;
export const pick = (): number => Math.random();
export const unused = [readFileSync, Injectable, express];
