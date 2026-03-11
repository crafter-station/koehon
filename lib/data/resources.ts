export interface Resource {
  id: string;
  title: string;
  coverUrl: string;
  createdAt: Date;
}

export const resources: Resource[] = [
  {
    id: "1",
    title: "The Art of Computer Programming",
    coverUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-01"),
  },
  {
    id: "2",
    title: "Deep Learning Fundamentals",
    coverUrl: "https://images.unsplash.com/photo-1589998059171-988d887df646?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-05"),
  },
  {
    id: "3",
    title: "Clean Code: A Handbook",
    coverUrl: "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-08"),
  },
  {
    id: "4",
    title: "System Design Interview",
    coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-10"),
  },
  {
    id: "5",
    title: "Introduction to Algorithms",
    coverUrl: "https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-12"),
  },
  {
    id: "6",
    title: "Design Patterns Explained",
    coverUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-15"),
  },
  {
    id: "7",
    title: "The Pragmatic Programmer",
    coverUrl: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-18"),
  },
  {
    id: "8",
    title: "Artificial Intelligence: A Modern Approach",
    coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=600&fit=crop",
    createdAt: new Date("2024-03-20"),
  },
];
