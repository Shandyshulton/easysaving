package transaction

type Type string

const (
	TypeIncome  Type = "income"
	TypeExpense Type = "expense"
)

func (t Type) IsValid() bool {
	return t == TypeIncome || t == TypeExpense
}
