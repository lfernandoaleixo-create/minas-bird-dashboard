/**
 * SettingsPanel — Configurações do Criatório
 * Gerenciamento de acessos dos funcionários
 */
import { useState } from "react";
import { Settings, Users, Eye, EyeOff, Shield, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  password: string;
  role: string;
  color: string;
}

const STAFF_MEMBERS: StaffMember[] = [
  { id: "1", name: "Pollyane", password: "minas2026polly", role: "Tratadora", color: "bg-emerald-100 text-emerald-700" },
  { id: "2", name: "Eneias", password: "minas2026eneias", role: "Tratador", color: "bg-blue-100 text-blue-700" },
  { id: "3", name: "Elaine", password: "minas2026elaine", role: "Tratadora", color: "bg-purple-100 text-purple-700" },
  { id: "4", name: "Juliano", password: "minas2026juliano", role: "Tratador", color: "bg-amber-100 text-amber-700" },
  { id: "5", name: "Fernando", password: "minas2026fernando", role: "Administrador", color: "bg-red-100 text-red-700" },
];

export default function SettingsPanel() {
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyPassword = (id: string, password: string) => {
    navigator.clipboard.writeText(password);
    setCopiedId(id);
    toast.success("Senha copiada!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-r from-stone-800 to-stone-600">
        <div className="absolute inset-0 flex items-end p-6">
          <div>
            <p className="text-white/70 text-xs font-semibold tracking-widest uppercase">Sistema</p>
            <h1 className="text-white text-2xl font-bold flex items-center gap-2">
              <Settings className="w-6 h-6" /> Configurações
            </h1>
            <p className="text-white/80 text-sm mt-1">Gerenciamento de acessos e equipe</p>
          </div>
        </div>
      </div>

      {/* Staff Access Card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h2 className="font-bold text-stone-800 text-lg">Equipe de Acesso</h2>
              <p className="text-xs text-stone-500">{STAFF_MEMBERS.length} funcionários cadastrados</p>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-stone-400" />
              <span className="text-[10px] text-stone-400 font-medium">Acesso controlado</span>
            </div>
          </div>
        </div>

        <div className="divide-y divide-stone-100">
          {STAFF_MEMBERS.map((member) => {
            const isVisible = visiblePasswords.has(member.id);
            const isCopied = copiedId === member.id;
            return (
              <div key={member.id} className="px-5 py-4 hover:bg-stone-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm", member.color)}>
                    {member.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-stone-800">{member.name}</h3>
                      <span className={cn("px-2 py-0.5 text-[10px] font-bold rounded-full", member.color)}>
                        {member.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] text-stone-400 font-medium">Senha:</span>
                      <code className="text-[11px] font-mono bg-stone-100 px-2 py-0.5 rounded text-stone-600 select-all">
                        {isVisible ? member.password : "••••••••••••"}
                      </code>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePassword(member.id)}
                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                      title={isVisible ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyPassword(member.id, member.password)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        isCopied
                          ? "text-emerald-600 bg-emerald-50"
                          : "text-stone-400 hover:text-blue-600 hover:bg-blue-50"
                      )}
                      title="Copiar senha"
                    >
                      {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 bg-amber-50 border-t border-amber-100">
          <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            As senhas são de uso interno do criatório. Não compartilhe com pessoas não autorizadas.
          </p>
        </div>
      </div>
    </div>
  );
}
