package me.hyfe.helper.command.command;

import com.google.common.collect.Sets;
import me.hyfe.helper.command.context.CommandContext;
import me.hyfe.helper.internal.LoaderUtils;
import me.hyfe.helper.text.Text;
import me.hyfe.helper.utils.CommandMapUtil;
import me.hyfe.helper.utils.Translate;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.command.ConsoleCommandSender;

import java.util.Arrays;
import java.util.Set;

public abstract class Command<T extends CommandSender> extends AbstractCommand<T> implements CommandExecutor {
    private final Set<String> aliases;
    private final Set<SubCommand<?>> subs = Sets.newLinkedHashSet();

    public Command(Class<T> senderClass, String permission, String description, String... aliases) {
        super(senderClass, permission, description);
        this.aliases = Sets.newHashSet(aliases);
        this.register();
    }

    public void setSubs(SubCommand<?>... subs) {
        this.subs.clear();
        this.subs.addAll(Arrays.asList(subs));
    }

    public void register() {
        CommandMapUtil.registerCommand(LoaderUtils.getPlugin(), this, this.aliases, this.permission, this.description);
    }

    @Override
    public boolean onCommand(CommandSender sender, org.bukkit.command.Command bukkitCommand, String label, String[] args) {
        if (!this.aliases.contains(bukkitCommand.getName())) {
            return true;
        }
        if (this.permission != null && !this.permission.isEmpty() && !sender.hasPermission(this.permission)) {
            Text.send(sender, "&cYou do not have the requires permissions for this command.");
            return true;
        }
        if (!this.canConsole() && sender instanceof ConsoleCommandSender) {
            Text.send(sender, "&cThis command can only be executed by a player.");
            return true;
        }
        T translatedSender = Translate.apply(sender, this.senderClass);
        CommandContext context = new CommandContext(args);
        if (args.length == 0) {
            this.handle(translatedSender, context);
            return true;
        }
        SubCommand<? super CommandSender> foundSub = null;
        for (SubCommand<? super CommandSender> sub : this.subs) {
            if ((args.length > sub.getArgumentsSize() && sub.isEndless())
                    || (sub.getArgumentsSize() == args.length && sub.isMatch(args))) {
                foundSub = sub;
                break;
            }
        }
        if (foundSub == null) {
            this.handle(translatedSender, context);
            return true;
        }
        if (!foundSub.canConsole() && sender instanceof ConsoleCommandSender) {
            Text.send(sender, "&cThis command can only be executed by a player.");
            return true;
        }
        foundSub.handle(Translate.apply(sender, foundSub.senderClass), context);
        return true;
    }
}
