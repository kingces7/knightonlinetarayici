import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skillPuaniIstegi, skillPuaniReddi } from './skillPuani.ts';

test('puan isteği tek bayt: ağaç numarası', () => { assert.deepEqual([...skillPuaniIstegi(6)], [6]); });
test('ret cevabı: ağaç ve mevcut puan', () => { assert.deepEqual(skillPuaniReddi(Uint8Array.from([5, 12])), { agac: 5, puan: 12 }); });
