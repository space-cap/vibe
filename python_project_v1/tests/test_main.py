"""Tests for main module."""

import pytest

from src.main import add_numbers, hello_world


class TestHelloWorld:
    """Test cases for hello_world function."""

    def test_hello_world_default(self) -> None:
        """Test hello_world with default parameter."""
        result = hello_world()
        assert result == "Hello, World!"

    def test_hello_world_with_name(self) -> None:
        """Test hello_world with custom name."""
        result = hello_world("Alice")
        assert result == "Hello, Alice!"

    def test_hello_world_empty_string(self) -> None:
        """Test hello_world with empty string."""
        result = hello_world("")
        assert result == "Hello, !"


class TestAddNumbers:
    """Test cases for add_numbers function."""

    def test_add_positive_numbers(self) -> None:
        """Test adding positive numbers."""
        result = add_numbers(2, 3)
        assert result == 5

    def test_add_negative_numbers(self) -> None:
        """Test adding negative numbers."""
        result = add_numbers(-2, -3)
        assert result == -5

    def test_add_mixed_numbers(self) -> None:
        """Test adding positive and negative numbers."""
        result = add_numbers(5, -3)
        assert result == 2

    def test_add_zero(self) -> None:
        """Test adding with zero."""
        result = add_numbers(5, 0)
        assert result == 5

    @pytest.mark.parametrize(
        "a,b,expected",
        [
            (1, 1, 2),
            (0, 0, 0),
            (10, 20, 30),
            (-5, 5, 0),
        ],
    )
    def test_add_numbers_parametrized(self, a: int, b: int, expected: int) -> None:
        """Test add_numbers with various inputs."""
        assert add_numbers(a, b) == expected
