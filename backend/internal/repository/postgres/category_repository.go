package postgres

import (
	"context"

	"easysaving/backend/internal/domain/category"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type CategoryRepository struct{ db *gorm.DB }

func NewCategoryRepository(db *gorm.DB) *CategoryRepository { return &CategoryRepository{db: db} }

func (r *CategoryRepository) Create(ctx context.Context, item *category.Category) error {
	return r.db.WithContext(ctx).Create(item).Error
}

func (r *CategoryRepository) ListByUser(ctx context.Context, userID string, categoryType string) ([]category.Category, error) {
	var items []category.Category
	query := r.db.WithContext(ctx).Where("(user_id IS NULL OR user_id = ?)", userID)
	if categoryType != "" {
		query = query.Where("type = ?", categoryType)
	}
	err := query.Order("type asc, name asc").Find(&items).Error
	return items, err
}

func (r *CategoryRepository) FindByID(ctx context.Context, id, userID string) (*category.Category, error) {
	var item category.Category
	err := r.db.WithContext(ctx).
		Where("id = ? AND (user_id IS NULL OR user_id = ?)", id, userID).
		First(&item).Error
	return &item, err
}

func (r *CategoryRepository) EnsureDefaults(ctx context.Context, userID string) error {
	defaults := []category.Category{
		{ID: uuid.NewString(), Name: "Gaji", Type: category.TypeIncome, Color: "#10b981", Icon: "Briefcase"},
		{ID: uuid.NewString(), Name: "Freelance", Type: category.TypeIncome, Color: "#059669", Icon: "Laptop"},
		{ID: uuid.NewString(), Name: "Bonus", Type: category.TypeIncome, Color: "#34d399", Icon: "Gift"},
		{ID: uuid.NewString(), Name: "Hadiah", Type: category.TypeIncome, Color: "#6ee7b7", Icon: "Sparkles"},
		{ID: uuid.NewString(), Name: "Makanan", Type: category.TypeExpense, Color: "#ef4444", Icon: "Utensils"},
		{ID: uuid.NewString(), Name: "Transportasi", Type: category.TypeExpense, Color: "#f97316", Icon: "Car"},
		{ID: uuid.NewString(), Name: "Belanja", Type: category.TypeExpense, Color: "#8b5cf6", Icon: "ShoppingBag"},
		{ID: uuid.NewString(), Name: "Tagihan", Type: category.TypeExpense, Color: "#0f172a", Icon: "Receipt"},
		{ID: uuid.NewString(), Name: "Hiburan", Type: category.TypeExpense, Color: "#06b6d4", Icon: "Film"},
		{ID: uuid.NewString(), Name: "Lainnya", Type: category.TypeExpense, Color: "#64748b", Icon: "Circle"},
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, item := range defaults {
			var count int64
			if err := tx.Model(&category.Category{}).Where("user_id IS NULL AND name = ? AND type = ?", item.Name, item.Type).Count(&count).Error; err != nil {
				return err
			}
			if count == 0 {
				if err := tx.Create(&item).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}
