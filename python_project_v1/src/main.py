"""Main module with example functions."""

from typing import Optional


def hello_world(name: Optional[str] = None) -> str:
    """Return a greeting message.

    Args:
        name: Optional name to greet. Defaults to "World".

    Returns:
        A greeting message.

    Examples:
        >>> hello_world()
        'Hello, World!'
        >>> hello_world("Alice")
        'Hello, Alice!'
    """
    if name is None:
        name = "World"
    return f"Hello, {name}!"


def add_numbers(a: int, b: int) -> int:
    """Add two numbers together.

    Args:
        a: First number to add.
        b: Second number to add.

    Returns:
        The sum of a and b.

    Examples:
        >>> add_numbers(2, 3)
        5
    """
    return a + b
