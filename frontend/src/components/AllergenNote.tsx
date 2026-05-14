import React from "react";
import { allergenMap, createAllergenNotes } from "../lib/allergenUtils";
import type { AllergenNote } from "../lib/allergenUtils";

const AllergenNote = () => {
  return (
    <div className="bg-[#18181c] rounded-2xl p-8 border border-[#23232a] mt-10 shadow-lg">
      {/* Heading */}
      <h3
        className="text-2xl font-semibold text-orange-500 mb-6 flex items-center gap-2"
        style={{ fontFamily: "var(--font-el-messiri)" }}
      >
        
        Allergen Information (EU 14 Major Allergens)
      </h3>

      {/* Allergen List */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[#d1d1d1] text-md" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
          {createAllergenNotes(Object.keys(allergenMap).map(Number)).map((note) => (
            <div key={note.code} className="flex items-center">
              <span className="font-bold text-orange-500 mr-2">{note.code}.</span>
              <span>{note.name}</span>
              {note.description && (
                <span className="text-xs text-[#888] ml-2">- {note.description}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 text-[#bbbbbb] text-md md:text-base leading-relaxed" style={{ fontFamily: 'var(--font-lato), sans-serif' }}>
        <p>
          Please inform a member of staff if you have any food allergies or
          special dietary requirements. <br></br>While we take great care, our kitchen
          handles all 14 allergens and we cannot guarantee dishes will be free
          from traces.
        </p>
      </div>
    </div>
  );
};

export default AllergenNote;
