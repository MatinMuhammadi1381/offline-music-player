const MAX_ID3_TAG_BYTES = 16 * 1024 * 1024;
const MAX_ID3_FRAMES = 2_048;
const MAX_PICTURE_PREFIX_BYTES = 64 * 1024;

function synchsafeInteger(bytes: Uint8Array, offset: number): number | undefined {
  const values = bytes.subarray(offset, offset + 4);
  if (values.length !== 4 || values.some((value) => value > 0x7f)) return undefined;
  return (values[0]! << 21) | (values[1]! << 14) | (values[2]! << 7) | values[3]!;
}

function bigEndianInteger(bytes: Uint8Array, offset: number): number | undefined {
  if (offset + 4 > bytes.length) return undefined;
  return (bytes[offset]! * 0x1000000)
    + (bytes[offset + 1]! << 16)
    + (bytes[offset + 2]! << 8)
    + bytes[offset + 3]!;
}

async function readRange(file: Blob, start: number, end: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

function findDescriptionEnd(bytes: Uint8Array, start: number, encoding: number): number | undefined {
  if (encoding === 1 || encoding === 2) {
    for (let index = start; index + 1 < bytes.length; index += 2) {
      if (bytes[index] === 0 && bytes[index + 1] === 0) return index + 2;
    }
    return undefined;
  }
  for (let index = start; index < bytes.length; index++) {
    if (bytes[index] === 0) return index + 1;
  }
  return undefined;
}

function imageMimeType(bytes: Uint8Array): string | undefined {
  const value = String.fromCharCode(...bytes).toLowerCase();
  if (value === "image/jpeg" || value === "image/jpg" || value === "jpg" || value === "jpeg") return "image/jpeg";
  if (value === "image/png" || value === "png") return "image/png";
  if (value === "image/gif" || value === "gif") return "image/gif";
  if (value === "image/webp" || value === "webp") return "image/webp";
  return undefined;
}

export async function extractEmbeddedArtwork(file: Blob): Promise<Blob | undefined> {
  if (file.size < 10) return undefined;
  const header = await readRange(file, 0, 10);
  if (String.fromCharCode(...header.subarray(0, 3)) !== "ID3") return undefined;

  const majorVersion = header[3];
  if (majorVersion !== 3 && majorVersion !== 4) return undefined;
  const tagSize = synchsafeInteger(header, 6);
  if (tagSize === undefined || tagSize < 1 || tagSize > MAX_ID3_TAG_BYTES) return undefined;

  const tagEnd = Math.min(file.size, 10 + tagSize);
  let cursor = 10;
  if ((header[5]! & 0x40) !== 0) {
    const extendedSizeBytes = await readRange(file, cursor, cursor + 4);
    const extendedSize = majorVersion === 4
      ? synchsafeInteger(extendedSizeBytes, 0)
      : bigEndianInteger(extendedSizeBytes, 0);
    if (extendedSize === undefined) return undefined;
    cursor += majorVersion === 4 ? extendedSize : extendedSize + 4;
  }

  let firstArtwork: Blob | undefined;
  for (let frameNumber = 0; frameNumber < MAX_ID3_FRAMES && cursor + 10 <= tagEnd; frameNumber++) {
    const frameHeader = await readRange(file, cursor, cursor + 10);
    const frameId = String.fromCharCode(...frameHeader.subarray(0, 4));
    if (!/^[A-Z0-9]{4}$/u.test(frameId)) break;

    const frameSize = majorVersion === 4
      ? synchsafeInteger(frameHeader, 4)
      : bigEndianInteger(frameHeader, 4);
    if (frameSize === undefined || frameSize < 1 || cursor + 10 + frameSize > tagEnd) break;

    if (frameId === "APIC") {
      const payloadStart = cursor + 10;
      const prefix = await readRange(file, payloadStart, Math.min(payloadStart + MAX_PICTURE_PREFIX_BYTES, payloadStart + frameSize));
      const encoding = prefix[0];
      if (encoding !== undefined && encoding <= 3) {
        let mimeEnd = 1;
        while (mimeEnd < prefix.length && prefix[mimeEnd] !== 0) mimeEnd++;
        const mimeType = imageMimeType(prefix.subarray(1, mimeEnd));
        const pictureTypeOffset = mimeEnd + 1;
        const descriptionStart = pictureTypeOffset + 1;
        const descriptionEnd = findDescriptionEnd(prefix, descriptionStart, encoding);
        const imageOffset = descriptionEnd === undefined ? -1 : payloadStart + descriptionEnd;
        const imageLength = payloadStart + frameSize - imageOffset;
        if (mimeType && imageOffset >= payloadStart && imageLength > 0) {
          const artwork = file.slice(imageOffset, imageOffset + imageLength, mimeType);
          if (prefix[pictureTypeOffset] === 3) return artwork;
          firstArtwork ??= artwork;
        }
      }
    }
    cursor += 10 + frameSize;
  }

  return firstArtwork;
}
