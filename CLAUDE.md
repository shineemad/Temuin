@AGENTS.md

## Git: commit & push otomatis

Setelah menyelesaikan perubahan kode dan memverifikasinya, **langsung commit dan push tanpa menunggu konfirmasi user**:

```bash
git add -A
git commit -m "<pesan singkat, bahasa Indonesia>"
git push
```

Aturan wajib:

- Verifikasi dulu. Jangan commit kalau masih ada error TypeScript/lint/build. Perbaiki sampai bersih.
- Push hanya ke branch yang sedang aktif. **Dilarang** `--force`, `--no-verify`, `reset --hard`, atau mengubah commit yang sudah ada di remote.
- Repo ini **public**. Jangan pernah men-stage `.env*`, kunci API, service role key, atau kredensial apa pun. Cek `git status` sebelum `git add`.
- Kalau push ditolak karena remote lebih baru: `git pull --rebase` lalu push ulang. Jangan overwrite kerja orang lain.
- Satu perubahan logis = satu commit. Jangan gabungkan perubahan yang tidak berhubungan.
- Lewati auto-push jika user bilang "jangan push", atau jika perubahan masih setengah jadi/eksperimental.
