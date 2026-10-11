
export const LANGUAGE_DEFAULTS = {
  javascript: "// Start typing code here",
  python: "# Start typing code here",

  c: `#include <stdio.h>

int main() {
    printf("Hello World\\n");
    return 0;
}`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello World" << endl;
    return 0;
}`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello World");
    }
}`,
};

export const LANGUAGE_EXT = {
  javascript: "solution.js",
  python: "solution.py",
  c: "solution.c",
  cpp: "solution.cpp",
  java: "Main.java",
};

export const LANGUAGE_OPTIONS = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
];

export const MONACO_LANGUAGES = {
  javascript: "javascript",
  python: "python",
  c: "c",
  cpp: "cpp",
  java: "java",
};
