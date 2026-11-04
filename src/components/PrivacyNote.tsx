/** Plain explanation of where data lives and what browser storage can't promise. */
export function PrivacyNote() {
  return (
    <div className="privacy-note">
      <p>
        <strong>Semua data tersimpan di perangkat ini.</strong> Date Planner tidak punya akun, server, atau backend.
        Rencana, venue, pengaturan, dan preferensimu disimpan di <em>localStorage</em> peramban ini dan tidak dikirim ke
        mana pun. Tautan Google Maps baru membuka Google ketika kamu menekannya.
      </p>
      <p className="eyebrow">Batasan penyimpanan peramban</p>
      <ul>
        <li>Data hanya ada di peramban dan perangkat ini — tidak tersinkron ke perangkat atau peramban lain.</li>
        <li>Menghapus data situs/riwayat peramban, atau memakai mode privat/penyamaran, akan menghapus data ini.</li>
        <li>Beberapa peramban (misalnya Safari) dapat menghapus data situs yang lama tidak dibuka.</li>
        <li>Kapasitasnya terbatas (umumnya sekitar 5 MB per situs).</li>
        <li>Siapa pun yang memakai peramban ini dapat melihat datanya.</li>
      </ul>
      <p>Ekspor cadangan secara berkala agar datamu aman.</p>
    </div>
  );
}
