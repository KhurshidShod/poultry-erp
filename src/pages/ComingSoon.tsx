
import { Construction, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center">
      <div className="surface-card w-full max-w-[460px] p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-custom bg-[#2E2E2E]">
          <Construction size={25} />
        </div>

        <h1 className="text-xl font-bold text-white">
          {title}
        </h1>

        <p className="mt-3 text-[13px] leading-6 text-[#A0A0A0]">
          Ushbu bo'lim ishlab chiqilmoqda.
          Tez orada barcha funksiyalar qo'shiladi.
        </p>

        <Link
          to="/"
          className="primary-button mt-7"
        >
          <ArrowLeft size={16} />
          Boshqaruv paneliga qaytish
        </Link>
      </div>
    </div>
  );
}
