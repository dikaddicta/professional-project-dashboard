# SOP — Client Access Management

SOP ini digunakan untuk membuat, mengaktifkan, menonaktifkan, atau mereset akses Client/Guest.

## 1. Prinsip Akses

Client/Guest hanya boleh melihat project yang diberikan akses aktif.

```text
Akses aktif   : client dapat melihat project.
Akses nonaktif: client tidak dapat melihat project.
```

## 2. Membuat Akses Client

Langkah:

```text
1. Login sebagai Project Manager.
2. Buka Kelola Project.
3. Pilih project yang akan diberikan akses.
4. Buka bagian Client Access.
5. Buat atau aktifkan akun guest/client.
6. Generate password awal.
7. Kirim credential kepada client melalui channel aman.
```

## 3. Reset Password Client

Gunakan reset password jika client lupa password atau akses perlu diperbarui.

Langkah:

```text
1. Buka Kelola Project.
2. Pilih project.
3. Buka Client Access.
4. Klik reset/generate password.
5. Kirim password baru melalui channel aman.
```

Catatan: dashboard tidak menampilkan password lama/current password.

## 4. Menonaktifkan Akses Client

Lakukan jika project selesai, akses tidak lagi diperlukan, atau ada kebutuhan keamanan.

Langkah:

```text
1. Buka Client Access.
2. Pilih akun client/guest.
3. Klik disable/nonaktifkan akses.
4. Pastikan client tidak lagi dapat membuka project.
```

## 5. Verifikasi Akses

Setelah membuat atau mengubah akses:

```text
1. Login menggunakan akun client/guest.
2. Pastikan hanya project yang diizinkan yang muncul.
3. Pastikan client tidak melihat Activity Log, Backup Data, dan Kelola Project.
4. Pastikan agenda internal tidak muncul.
```
