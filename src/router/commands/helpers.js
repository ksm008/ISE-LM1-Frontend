// 명령들이 같이 쓰는 비밀번호 처리
import { arg, kw } from '../engine/tree.js';
import { WORD } from '../engine/types.js';
import { decodeType7, encodeType7, hashSecret, isType5Hash } from '../crypto/passwords.js';

/** security passwords min-length 확인. 짧으면 오류를 출력하고 false */
export function lengthOk(ctx, plain) {
  const min = ctx.d.minPasswordLength;
  if (min > 0 && plain.length < min) {
    ctx.out(`% Password too short - must be at least ${min} characters. Password configuration failed`);
    return false;
  }
  return true;
}

/** 평문 비밀번호 저장 형식. service password-encryption 이 켜져 있으면 type 7 로 바꿔 둔다 */
export const plainPassword = (ctx, plain) => ({
  plain,
  enc: ctx.d.servicePasswordEncryption ? encodeType7(plain) : null,
});

/** type 7 로 입력한 비밀번호. 형식이 틀리면 오류를 출력하고 null */
export function type7Password(ctx, enc) {
  const plain = decodeType7(enc);
  if (plain === null) {
    ctx.out(`Invalid encrypted password: ${enc}`);
    return null;
  }
  return { plain, enc: enc.toUpperCase() };
}

/** type 5 해시로 입력한 secret. 형식이 틀리면 오류를 출력하고 null */
export function type5Secret(ctx, hash) {
  if (!isType5Hash(hash)) {
    ctx.out(
      'ERROR: The secret you entered is not a valid encrypted secret.',
      'To enter an UNENCRYPTED secret, do not specify type 5 encryption.',
      'When you properly enter an UNENCRYPTED secret, it will be encrypted.',
    );
    return null;
  }
  return { hash };
}

export const newSecret = (plain) => ({ hash: hashSecret(plain) });

/**
 * "[0 | 7] 비밀번호" 형태의 자식 노드 (password 류)
 * onSet(ctx, value) 의 value 는 { plain, enc }
 */
export function passwordChoices(onSet, what = '비밀번호') {
  const setPlain = (ctx, a) => {
    if (lengthOk(ctx, a.pw)) onSet(ctx, plainPassword(ctx, a.pw));
  };
  const setType7 = (ctx, a) => {
    const v = type7Password(ctx, a.enc);
    if (v) onSet(ctx, v);
  };
  return [
    kw('0', `암호화하지 않은 ${what}가 뒤따름`, [arg('pw', WORD, `평문 ${what}`, [], { run: setPlain })]),
    kw('7', `type 7 로 암호화된 ${what}가 뒤따름`, [arg('enc', WORD, `type 7 로 암호화된 ${what}`, [], { run: setType7 })]),
    arg('pw', WORD, `평문 ${what}`, [], { run: setPlain }),
  ];
}

/**
 * "[0 | 5] secret" 형태의 자식 노드 (secret 류)
 * onSet(ctx, value) 의 value 는 { hash }
 */
export function secretChoices(onSet, what = 'secret') {
  const setPlain = (ctx, a) => {
    if (lengthOk(ctx, a.pw)) onSet(ctx, newSecret(a.pw), a.pw);
  };
  const setHash = (ctx, a) => {
    const v = type5Secret(ctx, a.hash);
    if (v) onSet(ctx, v, null);
  };
  return [
    kw('0', `암호화하지 않은 ${what}가 뒤따름`, [arg('pw', WORD, `평문 ${what}`, [], { run: setPlain })]),
    kw('5', `type 5(MD5) 로 해시된 ${what}가 뒤따름`, [arg('hash', WORD, 'type 5 해시 ($1$...)', [], { run: setHash })]),
    arg('pw', WORD, `평문 ${what} (type 5 해시로 저장됨)`, [], { run: setPlain }),
  ];
}
