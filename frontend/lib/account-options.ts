export const accountCategoryOptions = [
  { value: "bank", label: "Bank" },
  { value: "wallet", label: "E-Wallet" },
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investasi" },
  { value: "other", label: "Lainnya" }
];

export function accountCategoryLabel(value?: string) {
  return accountCategoryOptions.find((item) => item.value === value)?.label ?? "Lainnya";
}
