import Image from "next/image";

type DemoMediaProps = {
  src: string;
  alt: string;
  priority?: boolean;
};

function isVideo(src: string) {
  return /\.(mp4|webm|ogg)$/i.test(src);
}

function isRemoteAsset(src: string) {
  return /^https?:\/\//i.test(src);
}

export function DemoMedia({ src, alt, priority = false }: DemoMediaProps) {
  if (isVideo(src)) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#d9e5f6]">
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
        />
        <video
          src={src}
          autoPlay
          muted
          loop
          playsInline
          className="relative z-10 h-full w-full object-contain"
        />
      </div>
    );
  }

  if (isRemoteAsset(src)) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-[#d9e5f6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="relative z-10 h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#d9e5f6]">
      <Image
        src={src}
        alt=""
        aria-hidden="true"
        fill
        priority={priority}
        className="scale-110 object-cover opacity-35 blur-2xl"
      />
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className="relative z-10 object-contain"
      />
    </div>
  );
}
