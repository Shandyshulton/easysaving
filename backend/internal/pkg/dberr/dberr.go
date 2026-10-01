// Package dberr turns raw PostgreSQL constraint errors into messages a user can
// act on, instead of leaking text like
// `ERROR: new row for relation "transactions" violates check constraint ...`.
package dberr

import (
	"errors"
	"strings"
)

// constraintMessages maps constraint names to human explanations. Matching is done
// on the error text so no PostgreSQL driver types need to be imported here.
var constraintMessages = map[string]string{
	// chk_transactions_amount_positive is declared NOT VALID, so it does not reject
	// pre-existing rows on boot. It *does* apply the moment such a row is updated,
	// which is exactly the case this message explains.
	"chk_transactions_amount_positive": "Nominal transaksi harus lebih besar dari 0. " +
		"Transaksi lama yang nominalnya 0 atau negatif harus dibetulkan nominalnya sebelum bisa disimpan ulang.",

	"chk_scheduled_auto_amount": "Jadwal mode Otomatis wajib punya nominal. " +
		"Isi nominalnya, atau ubah mode menjadi Pengingat.",
	"chk_scheduled_amount_positive": "Nominal jadwal harus lebih besar dari 0.",
	"chk_scheduled_remind_days":     "Ingatkan H- harus antara 0 dan 30 hari.",
	"chk_scheduled_interval":        "Interval pengulangan minimal 1.",
	"chk_scheduled_date_range":      "Tanggal berakhir tidak boleh sebelum tanggal mulai.",
	"chk_scheduled_mode":            "Mode jadwal tidak dikenal.",
	"chk_scheduled_frequency":       "Frekuensi jadwal tidak dikenal.",
	"chk_scheduled_type":            "Tipe transaksi tidak dikenal.",

	"uq_transactions_schedule_due": "Transaksi untuk periode jadwal ini sudah pernah dicatat.",

	"fk_scheduled_account":  "Rekening yang dipilih tidak ditemukan.",
	"fk_scheduled_category": "Kategori yang dipilih tidak ditemukan.",
}

// Translate replaces a known constraint violation with a friendly message and
// returns every other error untouched.
func Translate(err error) error {
	if err == nil {
		return nil
	}
	text := err.Error()
	for constraint, message := range constraintMessages {
		if strings.Contains(text, constraint) {
			return errors.New(message)
		}
	}
	return err
}
