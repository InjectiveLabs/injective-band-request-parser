export const bytesFromBase64 = (b64: string): Uint8Array => {
  const bin = Buffer.from(b64, "base64");
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; ++i) {
    arr[i] = bin.toString().charCodeAt(i);
  }
  return arr;
};

export const uint8ArrayToString = (
  string: string | Uint8Array | null | undefined
): string => {
  if (!string) {
    return "";
  }

  if (string.constructor !== Uint8Array) {
    return string as string;
  }

  return new TextDecoder().decode(string);
};
