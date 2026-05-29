import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { COLORS } from '../theme';
import CATEGORIES from '../data/products.json';

interface Product {
  id: string;
  brand: string;
  name: string;
  emoji: string;
  price: string;
  rating: number;
  reviews: number;
  description: string;
  age: string;
  link: string;
}

interface Category {
  id: string;
  name: string;
  emoji: string;
  products: Product[];
}

const renderStars = (rating: number) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5 ? 1 : 0;
  return '★'.repeat(full) + (half ? '½' : '');
};

const AGE_FILTERS = ['All', '0m+', '3m+', '6m+', '12m+', '0-12m', '0-24m', '0-4y', '0-48m'];

export default function ProductsScreen() {
  const [ageFilter, setAgeFilter] = useState('All');
  const { effectiveTheme } = useTheme();
  const C = COLORS[effectiveTheme];

  const filtered = CATEGORIES.map(cat => ({
    ...cat,
    products: cat.products.filter(p => {
      if (ageFilter === 'All') return true;
      if (p.age === 'All') return true;
      return p.age === ageFilter || p.age.startsWith(ageFilter.replace('m+', ''));
    })
  })).filter(cat => cat.products.length > 0);

  const handleProductPress = async (product: Product) => {
    try {
      await Linking.openURL(product.link);
    } catch {
      // Fallback: no external link on this platform
    }
  };

  const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: C.background },
    container: { flex: 1, backgroundColor: C.background },
    content: { padding: 20, paddingBottom: 100 },
    header: { marginBottom: 16 },
    greeting: { fontSize: 14, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },
    title: { fontSize: 32, fontWeight: 'bold', color: C.text, marginTop: 4 },
    subtitle: { fontSize: 14, color: C.muted, marginTop: 8 },
    filterRow: { flexDirection: 'row', marginBottom: 20, maxHeight: 40 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: C.card,
      marginRight: 8,
      borderWidth: 1,
      borderColor: C.border,
    },
    filterChipActive: {
      backgroundColor: C.accent,
      borderColor: C.accent,
    },
    filterChipText: { fontSize: 13, color: C.muted, fontWeight: '500' },
    filterChipTextActive: { color: C.text },
    categorySection: { marginBottom: 24 },
    categoryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
      gap: 8,
    },
    categoryEmoji: { fontSize: 20 },
    categoryName: { fontSize: 16, fontWeight: '600', color: C.text, flex: 1 },
    categoryCount: { fontSize: 12, color: C.muted },
    productCard: {
      backgroundColor: C.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: C.border,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    productEmoji: { fontSize: 28, marginRight: 14, marginTop: 2 },
    productInfo: { flex: 1 },
    productHeader: { marginBottom: 4 },
    productNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
    productBrand: { fontSize: 12, color: C.accent, fontWeight: '600' },
    productAge: {
      fontSize: 10,
      color: C.muted,
      backgroundColor: C.card,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    productName: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
    productPrice: { fontSize: 15, fontWeight: '600', color: C.accent },
    productMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    productRating: { fontSize: 12, color: '#f39c12', fontWeight: '600' },
    productReviews: { fontSize: 11, color: C.muted },
    productDescription: { fontSize: 12, color: C.muted, lineHeight: 17 },
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Trusted</Text>
          <Text style={styles.title}>Baby Products</Text>
          <Text style={styles.subtitle}>HK & international brands with reviews</Text>
        </View>

        {/* Age Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {AGE_FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, ageFilter === filter && styles.filterChipActive]}
              onPress={() => setAgeFilter(filter)}
            >
              <Text style={[styles.filterChipText, ageFilter === filter && styles.filterChipTextActive]}>
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {filtered.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryEmoji}>{category.emoji}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.products.length} items</Text>
            </View>
            {category.products.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                activeOpacity={0.7}
                onPress={() => handleProductPress(product)}
              >
                <Text style={styles.productEmoji}>{product.emoji}</Text>
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <View style={styles.productNameRow}>
                      <Text style={styles.productBrand}>{product.brand}</Text>
                      <Text style={styles.productAge}>{product.age}</Text>
                    </View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>{product.price}</Text>
                  </View>
                  <View style={styles.productMeta}>
                    <Text style={styles.productRating}>{renderStars(product.rating)} {product.rating}</Text>
                    <Text style={styles.productReviews}>{product.reviews.toLocaleString()} reviews</Text>
                  </View>
                  <Text style={styles.productDescription}>{product.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}


