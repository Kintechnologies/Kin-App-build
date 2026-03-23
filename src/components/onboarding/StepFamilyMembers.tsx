"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Plus, X } from "lucide-react";
import type { FamilyMember } from "@/types";

interface Props {
  members: FamilyMember[];
  onUpdate: (members: FamilyMember[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepFamilyMembers({ members, onUpdate, onNext, onBack }: Props) {
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newType, setNewType] = useState<FamilyMember["type"]>("child");

  function addMember() {
    if (!newName.trim()) return;
    onUpdate([
      ...members,
      {
        name: newName.trim(),
        age: newAge ? parseInt(newAge) : undefined,
        type: newType,
      },
    ]);
    setNewName("");
    setNewAge("");
    setNewType("child");
  }

  function removeMember(index: number) {
    onUpdate(members.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif italic text-xl text-warm-white mb-1">
          Who&apos;s in your family?
        </h2>
        <p className="text-warm-white/50 text-sm">
          Add kids, pets, or other household members
        </p>
      </div>

      {/* Current members */}
      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((member, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-background rounded-lg px-4 py-3 border border-warm-white/10"
            >
              <div>
                <span className="text-warm-white text-sm font-medium">
                  {member.name}
                </span>
                <span className="text-warm-white/40 text-xs ml-2">
                  {member.type}
                  {member.age ? `, ${member.age}` : ""}
                </span>
              </div>
              <button
                onClick={() => removeMember(i)}
                className="text-warm-white/30 hover:text-rose transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add member form */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMember();
              }
            }}
          />
          <Input
            placeholder="Age"
            type="number"
            value={newAge}
            onChange={(e) => setNewAge(e.target.value)}
            className="w-20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addMember();
              }
            }}
          />
        </div>
        <div className="flex gap-2 items-center">
          {(["child", "adult", "pet"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setNewType(type)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border capitalize ${
                newType === type
                  ? "bg-primary/20 border-primary text-primary"
                  : "bg-background border-warm-white/20 text-warm-white/60"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <Button
          onClick={addMember}
          disabled={!newName.trim()}
          variant="secondary"
          size="lg"
          className="w-full"
        >
          <Plus size={18} className="mr-2" /> Add Family Member
        </Button>
      </div>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} className="flex-1" size="lg">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1" size="lg">
          Continue
        </Button>
      </div>
    </div>
  );
}
