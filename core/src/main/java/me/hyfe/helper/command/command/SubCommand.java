package me.hyfe.helper.command.command;

import com.google.common.collect.Sets;
import me.hyfe.helper.command.argument.Argument;
import me.hyfe.helper.command.argument.ArgumentTypes;
import me.hyfe.helper.command.context.CommandContext;
import me.hyfe.helper.command.context.SubCommandContext;
import me.hyfe.helper.command.tabcomplete.TabResolver;
import org.bukkit.command.CommandSender;

import java.util.ArrayList;
import java.util.List;

public abstract class SubCommand<T extends CommandSender> extends AbstractCommand<T> {
    private final List<Argument<?>> arguments = new ArrayList<>();
    private final boolean endless;

    public SubCommand(Class<T> senderClass, String permission, String description) {
        this(senderClass, permission, description, false);
    }

    public SubCommand(Class<T> senderClass, String permission, String description, boolean endless) {
        super(senderClass, permission, description);
        this.endless = endless;
    }

    public abstract void handleSub(T sender, SubCommandContext context);

    @Override
    public void handle(T sender, CommandContext context) {
        // ignore
    }

    @SuppressWarnings("unchecked")
    public <U extends CommandSender> void handleSubWare(U sender, SubCommandContext context) {
        this.handle((T) sender, context);
    }

    public boolean isEndless() {
        return this.endless;
    }

    public void argument(String name, String... aliases) {
        this.argument(null, name, null, aliases);
    }

    public <U> void argument(Class<U> clazz, String name, String... aliases) {
        this.argument(clazz, name, null, aliases);
    }

    public <U> void argument(Class<U> clazz, String name, TabResolver tabResolver, String... aliases) {
        this.arguments.add(new Argument<U>(ArgumentTypes.getType(clazz), name, Sets.newHashSet(aliases), tabResolver));
    }

    public List<Argument<?>> getArguments() {
        return this.arguments;
    }

    public int argumentsLength() {
        return this.arguments.size();
    }

    public SubCommandContext createSubContext(String[] args) {
        return new SubCommandContext(args, this);
    }
}
