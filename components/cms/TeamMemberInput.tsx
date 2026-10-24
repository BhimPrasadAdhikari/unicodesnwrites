'use client';

import React from 'react';

interface TeamMember {
  name: string;
  role: string;
  link?: string;
}

interface TeamMemberInputProps {
  members: TeamMember[];
  onChange: (members: TeamMember[]) => void;
}

export default function TeamMemberInput({ members = [], onChange }: TeamMemberInputProps) {
  const handleAdd = () => {
    onChange([...members, { name: '', role: '' }]);
  };

  const handleChange = (index: number, field: keyof TeamMember, value: string) => {
    const newMembers = [...members];
    newMembers[index] = { ...newMembers[index], [field]: value };
    onChange(newMembers);
  };

  const handleRemove = (index: number) => {
    const newMembers = [...members];
    newMembers.splice(index, 1);
    onChange(newMembers);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-foreground">Team Members</label>
        <button
          type="button"
          onClick={handleAdd}
          className="text-sm text-foreground underline decoration-primary decoration-2 underline-offset-4 hover:text-primary"
        >
          + Add Member
        </button>
      </div>

      {members.map((member, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="flex-1 space-y-2 sm:space-y-0 sm:flex sm:gap-2">
            <input
              type="text"
              placeholder="Name"
              className="block w-full rounded-md border-input bg-background text-foreground focus:border-primary focus:ring-primary sm:text-sm p-2 border"
              value={member.name}
              onChange={(e) => handleChange(index, 'name', e.target.value)}
            />
            <input
              type="text"
              placeholder="Role"
              className="block w-full rounded-md border-input bg-background text-foreground focus:border-primary focus:ring-primary sm:text-sm p-2 border"
              value={member.role}
              onChange={(e) => handleChange(index, 'role', e.target.value)}
            />
             <input
              type="url"
              placeholder="Social Link (optional)"
              className="block w-full rounded-md border-input bg-background text-foreground focus:border-primary focus:ring-primary sm:text-sm p-2 border"
              value={member.link || ''}
              onChange={(e) => handleChange(index, 'link', e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => handleRemove(index)}
            className="text-destructive hover:text-destructive/80 p-2"
          >
            &times;
          </button>
        </div>
      ))}
      
      {members.length === 0 && (
         <p className="text-sm text-muted-foreground italic">No team members added yet.</p>
      )}
    </div>
  );
}
